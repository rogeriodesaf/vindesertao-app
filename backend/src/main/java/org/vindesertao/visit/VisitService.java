package org.vindesertao.visit;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.territory.TerritoryService;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserTeamMembershipRepository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
    PhotoStorageService photoStorage;

    @Transactional
    public HouseholdVisit create(VisitDtos.VisitRequest request) {
        AppUser user = currentUser.entity();
        Team visitTeam = resolveVisitTeam(user);
        HouseholdVisit visit = new HouseholdVisit();
        apply(request, visit);
        visit.responsibleUser = user;
        visit.team = visitTeam;
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
        if (!currentUser.isLeader()) {
            throw new IllegalArgumentException("Somente o lider da equipe pode editar fichas ja cadastradas.");
        }
        Team visitTeam = resolveVisitTeam(user);
        HouseholdVisit visit = getAllowed(id, true, user);
        String before = snapshot(visit);
        apply(request, visit);
        validateTerritoryRule(user, visit, visitTeam);
        visit.updatedAt = OffsetDateTime.now();
        visit.updatedBy = user.email;
        auditService.log("UPDATE", "VISIT", visit.id, before, snapshot(visit));
        return visit;
    }

    public HouseholdVisit getAllowed(Long id, boolean edit, AppUser user) {
        HouseholdVisit visit = visits.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Visita nao encontrada."));
        if (currentUser.isAdmin()) {
            return visit;
        }
        if (currentUser.isLeader() && user.team != null && visit.team != null && user.team.id.equals(visit.team.id)) {
            return visit;
        }
        if (!edit && visit.team != null && visibleVisitTeamIds(user).contains(visit.team.id)) {
            return visit;
        }
        if (visit.responsibleUser != null && visit.responsibleUser.id.equals(user.id)) {
            return visit;
        }
        throw new SecurityException(edit ? "Sem permissao para editar esta visita." : "Sem permissao para ver esta visita.");
    }

    public PanacheQuery<HouseholdVisit> filtered(String neighborhood, Boolean wantsVisits, Long responsibleUserId,
                                                 Long teamId, OffsetDateTime from, OffsetDateTime to) {
        AppUser user = currentUser.entity();
        List<String> where = new ArrayList<>();
        Parameters params = new Parameters();

        where.add("lower(coalesce(responsibleUser.roles, '')) not like :adminRole");
        params.and("adminRole", "%admin%");

        if (!currentUser.isAdmin()) {
            Set<Long> visibleTeamIds = visibleVisitTeamIds(user);
            if (!visibleTeamIds.isEmpty()) {
                where.add("team.id in :visibleTeamIds");
                params.and("visibleTeamIds", visibleTeamIds);
            } else {
                where.add("responsibleUser.id = :currentUserId");
                params.and("currentUserId", user.id);
            }
        }
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
        var enforced = territoryService.enforcedForTeam(visitTeam.id);
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

    private Team resolveVisitTeam(AppUser user) {
        if (currentUser.isAdmin()) {
            throw new IllegalArgumentException("O administrador acompanha as visitas pelo mapa e relatorios, mas nao registra fichas de visita.");
        }
        if (!user.canRegisterVisits) {
            throw new IllegalArgumentException("Este usuario ou equipe nao esta autorizado a registrar visitas.");
        }
        if (user.team != null && user.team.canRegisterVisits) {
            return user.team;
        }
        return memberships.find("user.id = ?1 and team.canRegisterVisits = true order by team.name", user.id)
                .firstResultOptional()
                .map(membership -> membership.team)
                .orElseThrow(() -> new IllegalArgumentException("Este usuario precisa estar vinculado a uma equipe de evangelismo para registrar visitas."));
    }

    private Set<Long> visibleVisitTeamIds(AppUser user) {
        Set<Long> ids = new LinkedHashSet<>();
        if (user.team != null && user.team.canRegisterVisits) {
            ids.add(user.team.id);
        }
        memberships.find("user.id = ?1 and team.canRegisterVisits = true order by team.name", user.id)
                .list()
                .forEach(membership -> ids.add(membership.team.id));
        return ids;
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
