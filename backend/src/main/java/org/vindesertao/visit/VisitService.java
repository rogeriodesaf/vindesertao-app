package org.vindesertao.visit;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;
import org.vindesertao.team.TeamType;
import org.vindesertao.territory.TerritoryService;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserTeamMembershipRepository;
import org.vindesertao.edition.Edition;
import org.vindesertao.edition.EditionService;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class VisitService {
    private static final int MAX_PHOTO_DATA_LENGTH = 1_500_000;

    @Inject
    VisitRepository visits;

    @Inject
    CurrentUser currentUser;

    @Inject
    AuditService auditService;

    @Inject
    TerritoryService territoryService;

    @Inject
    UserTeamMembershipRepository memberships;

    @Inject
    TeamRepository teams;

    @Inject
    PhotoStorageService photoStorage;

    @Inject
    EditionService editions;

    @Transactional
    public HouseholdVisit create(VisitDtos.VisitRequest request) {
        AppUser user = currentUser.entity();
        Edition edition = editions.active();
        editions.requireOperationalAccess(user, edition);
        String clientReference = trimToNull(request.clientReference());
        if (clientReference != null) {
            HouseholdVisit existing = visits.find("clientReference = ?1 and responsibleUser.id = ?2", clientReference, user.id).firstResult();
            if (existing != null) {
                // The response is assembled after the transactional interceptor returns.
                // Initialize the two lazy relations while the persistence context is open.
                existing.responsibleUser.name.length();
                if (existing.team != null) existing.team.name.length();
                return existing;
            }
        }
        Team visitTeam = resolveVisitTeam(user, request.teamId(), edition);
        HouseholdVisit visit = new HouseholdVisit();
        apply(request, visit);
        visit.responsibleUser = user;
        visit.team = visitTeam;
        visit.edition = edition;
        validateTerritoryRule(user, visit, visitTeam);
        visit.createdAt = OffsetDateTime.now();
        visit.createdBy = user.email;
        visits.persist(visit);
        auditService.log("CREATE", "VISIT", visit.id, null, snapshot(visit));
        return visit;
    }

    @Transactional
    public HouseholdVisit update(Long id, VisitDtos.VisitRequest request) {
        AppUser user = currentUser.entity();
        editions.requireOperationalAccess(user, editions.active());
        HouseholdVisit visit = getAllowed(id, true, user);
        Team visitTeam = visit.team;
        String before = snapshot(visit);
        apply(request, visit);
        validateTerritoryRule(user, visit, visitTeam);
        visit.updatedAt = OffsetDateTime.now();
        visit.updatedBy = user.email;
        auditService.log("UPDATE", "VISIT", visit.id, before, snapshot(visit));
        return visit;
    }

    @Transactional
    public void delete(Long id) {
        if (!currentUser.isAdmin()) {
            throw new ForbiddenException("Somente administradores podem excluir fichas de visita.");
        }
        HouseholdVisit visit = getAllowed(id, true, currentUser.entity());
        String before = snapshot(visit);
        visits.delete(visit);
        auditService.log("DELETE", "VISIT", id, before, null);
    }

    public HouseholdVisit getAllowed(Long id, boolean edit, AppUser user) {
        HouseholdVisit visit = visits.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Visita nao encontrada."));
        if (currentUser.isAdmin()) {
            return visit;
        }
        editions.requireOperationalAccess(user, editions.active());
        if (visit.edition == null || !visit.edition.id.equals(editions.active().id)) {
            throw new ForbiddenException("Esta ficha pertence a outra edicao.");
        }
        if (currentUser.isLeader()) {
            Team leaderTeam = editions.teamFor(user, editions.active());
            if (leaderTeam != null && visit.team != null && leaderTeam.id.equals(visit.team.id)) {
                return visit;
            }
            throw new ForbiddenException(edit ? "Sem permissao para editar esta visita." : "Sem permissao para ver esta visita.");
        }
        if (!edit) {
            return visit;
        }
        if (visit.responsibleUser != null && visit.responsibleUser.id.equals(user.id)) {
            return visit;
        }
        throw new ForbiddenException(edit ? "Sem permissao para editar esta visita." : "Sem permissao para ver esta visita.");
    }

    public PanacheQuery<HouseholdVisit> filtered(String neighborhood, Boolean wantsVisits, Long responsibleUserId,
                                                 Long teamId, OffsetDateTime from, OffsetDateTime to) {
        editions.requireOperationalAccess(currentUser.entity(), editions.active());
        List<String> where = new ArrayList<>();
        Parameters params = new Parameters();

        where.add("edition.id = :editionId");
        params.and("editionId", editions.active().id);

        if (neighborhood != null && !neighborhood.isBlank()) {
            where.add("lower(neighborhood) like :neighborhood");
            params.and("neighborhood", "%" + neighborhood.toLowerCase() + "%");
        }
        if (wantsVisits != null) {
            where.add("wantsVisits = :wantsVisits");
            params.and("wantsVisits", wantsVisits);
        }
        if (responsibleUserId != null) {
            where.add("responsibleUser.id = :responsibleUserId");
            params.and("responsibleUserId", responsibleUserId);
        }
        if (teamId != null) {
            where.add("team.id = :teamIdFilter");
            params.and("teamIdFilter", teamId);
        }
        if (currentUser.isLeader()) {
            Team leaderTeam = editions.teamFor(currentUser.entity(), editions.active());
            where.add("team.id = :leaderTeamId");
            params.and("leaderTeamId", leaderTeam == null ? -1L : leaderTeam.id);
        }
        if (from != null) {
            where.add("createdAt >= :from");
            params.and("from", from);
        }
        if (to != null) {
            where.add("createdAt <= :to");
            params.and("to", to);
        }

        String query = where.isEmpty() ? "order by createdAt desc" : String.join(" and ", where) + " order by createdAt desc";
        Map<String, Object> map = params.map();
        return map.isEmpty() ? visits.find(query) : visits.find(query, map);
    }

    private void apply(VisitDtos.VisitRequest request, HouseholdVisit visit) {
        visit.personName = request.personName();
        visit.phone = request.phone();
        visit.street = request.street();
        visit.number = request.number();
        visit.neighborhood = request.neighborhood();
        visit.city = request.city();
        visit.manualAddress = request.manualAddress();
        visit.latitude = request.latitude();
        visit.longitude = request.longitude();
        visit.wantsVisits = request.wantsVisits();
        visit.personAge = request.personAge();
        visit.householdSize = request.householdSize();
        visit.referencePoint = request.referencePoint();
        visit.prayerRequest = request.prayerRequest();
        visit.nextVisitAt = request.nextVisitAt();
        visit.notes = request.notes();
        visit.streetViewUrl = trimToNull(request.streetViewUrl());
        if (visit.clientReference == null) visit.clientReference = trimToNull(request.clientReference());
        applyPhoto(request, visit);
    }

    private void applyPhoto(VisitDtos.VisitRequest request, HouseholdVisit visit) {
        String photoData = trimToNull(request.photoData());
        String photoUrl = trimToNull(request.photoUrl());
        if (photoData != null && photoData.length() > MAX_PHOTO_DATA_LENGTH) {
            throw new IllegalArgumentException("A foto anexada ficou muito grande. Tente tirar outra foto ou selecionar uma imagem menor.");
        }

        if (photoData != null) {
            var stored = photoStorage.upload(photoData, request.photoFileName());
            visit.photoData = stored.localData();
            visit.photoUrl = stored.url();
            visit.photoPublicId = stored.publicId();
            visit.photoContentType = trimToNull(request.photoContentType());
            visit.photoFileName = trimToNull(request.photoFileName());
            return;
        }

        if (photoUrl != null && photoUrl.equals(visit.photoUrl)) {
            return;
        }

        visit.photoData = null;
        visit.photoUrl = null;
        visit.photoPublicId = null;
        visit.photoContentType = null;
        visit.photoFileName = null;
    }

    private void validateTerritoryRule(AppUser user, HouseholdVisit visit, Team visitTeam) {
        if (!user.hasRole("projetista") || visitTeam == null) {
            return;
        }
        var enforced = territoryService.enforcedForTeam(visitTeam.id, visit.edition == null ? editions.active().id : visit.edition.id);
        if (enforced.isEmpty()) {
            return;
        }
        if (visit.latitude == null || visit.longitude == null) {
            throw new IllegalArgumentException("Esta equipe exige que o projetista marque a casa dentro do territorio no mapa.");
        }
        boolean inside = enforced.stream().anyMatch(territory -> territoryService.contains(territory, visit.latitude, visit.longitude));
        if (!inside) {
            throw new IllegalArgumentException("Esta casa esta fora do territorio atribuido a sua equipe.");
        }
    }

    private Team resolveVisitTeam(AppUser user, Long requestedTeamId, Edition edition) {
        if (currentUser.isAdmin()) {
            if (requestedTeamId == null) {
                throw new IllegalArgumentException("Selecione uma equipe de evangelismo para esta visita.");
            }
            Team team = teams.findByIdOptional(requestedTeamId)
                    .orElseThrow(() -> new IllegalArgumentException("Equipe nao encontrada."));
            if (team.edition == null || !team.edition.id.equals(edition.id)
                    || team.teamType != TeamType.EVANGELISM || !team.canRegisterVisits) {
                throw new IllegalArgumentException("Selecione uma equipe de evangelismo da edicao ativa.");
            }
            return team;
        }
        if (!user.canRegisterVisits) {
            throw new IllegalArgumentException("Este usuario ou equipe nao esta autorizado a registrar visitas.");
        }
        Team editionTeam = editions.teamFor(user, edition);
        if (editionTeam != null && editionTeam.canRegisterVisits) {
            return requireAssignedTeam(editionTeam, requestedTeamId);
        }
        if (user.team != null && user.team.canRegisterVisits && user.team.edition != null && user.team.edition.id.equals(edition.id)) {
            return requireAssignedTeam(user.team, requestedTeamId);
        }
        Team team = memberships.find("user.id = ?1 and team.canRegisterVisits = true and team.edition.id = ?2 order by team.name", user.id, edition.id)
                .firstResultOptional()
                .map(membership -> membership.team)
                .orElseThrow(() -> new IllegalArgumentException("Este usuario precisa estar vinculado a uma equipe de evangelismo para registrar visitas."));
        return requireAssignedTeam(team, requestedTeamId);
    }

    private Team requireAssignedTeam(Team assignedTeam, Long requestedTeamId) {
        if (requestedTeamId != null && !requestedTeamId.equals(assignedTeam.id)) {
            throw new ForbiddenException("A equipe selecionada nao pertence ao seu acesso operacional.");
        }
        return assignedTeam;
    }

    private String snapshot(HouseholdVisit visit) {
        return "{\"personName\":\"" + safe(visit.personName) + "\",\"phone\":\"" + safe(visit.phone)
                + "\",\"address\":\"" + safe((visit.street == null ? "" : visit.street) + " " + (visit.number == null ? "" : visit.number))
                + "\",\"team\":\"" + safe(visit.team == null ? null : visit.team.name)
                + "\",\"responsible\":\"" + safe(visit.responsibleUser == null ? null : visit.responsibleUser.email)
                + "\",\"wantsVisits\":" + visit.wantsVisits
                + ",\"hasPhoto\":" + hasPhoto(visit) + "}";
    }

    private boolean hasPhoto(HouseholdVisit visit) {
        return (visit.photoUrl != null && !visit.photoUrl.isBlank())
                || (visit.photoData != null && !visit.photoData.isBlank());
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
