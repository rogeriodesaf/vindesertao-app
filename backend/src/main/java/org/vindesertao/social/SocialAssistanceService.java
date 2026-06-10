package org.vindesertao.social;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;
import org.vindesertao.team.TeamType;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserTeamMembershipRepository;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class SocialAssistanceService {
    @Inject
    SocialAssistanceRepository records;

    @Inject
    CurrentUser currentUser;

    @Inject
    TeamRepository teams;

    @Inject
    UserTeamMembershipRepository memberships;

    @Inject
    AuditService auditService;

    @Transactional
    public SocialAssistanceRecord create(SocialAssistanceDtos.SocialAssistanceRequest request) {
        AppUser user = currentUser.entity();
        Team team = resolveSocialTeam(user, request.teamId());
        SocialAssistanceRecord record = new SocialAssistanceRecord();
        apply(request, record);
        record.quantity = request.quantity() == null || request.quantity() < 1 ? 1 : request.quantity();
        record.team = team;
        record.responsibleUser = user;
        record.createdAt = OffsetDateTime.now();
        record.createdBy = user.email;
        records.persist(record);
        auditService.log("CREATE", "SOCIAL_ASSISTANCE", record.id, null, snapshot(record));
        return record;
    }

    @Transactional
    public SocialAssistanceRecord update(Long id, SocialAssistanceDtos.SocialAssistanceRequest request) {
        AppUser user = currentUser.entity();
        SocialAssistanceRecord record = getAllowed(id, true, user);
        String before = snapshot(record);
        apply(request, record);
        record.quantity = request.quantity() == null || request.quantity() < 1 ? 1 : request.quantity();
        record.team = resolveSocialTeam(user, request.teamId());
        record.updatedAt = OffsetDateTime.now();
        record.updatedBy = user.email;
        auditService.log("UPDATE", "SOCIAL_ASSISTANCE", record.id, before, snapshot(record));
        return record;
    }

    public SocialAssistanceRecord getAllowed(Long id, boolean edit, AppUser user) {
        SocialAssistanceRecord record = records.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Atendimento social nao encontrado."));
        if (currentUser.isAdmin()) {
            return record;
        }
        Set<Long> visibleTeamIds = visibleSocialTeamIds(user);
        if (record.team != null && visibleTeamIds.contains(record.team.id)) {
            if (!edit || currentUser.isLeader() || record.responsibleUser.id.equals(user.id)) {
                return record;
            }
        }
        throw new SecurityException(edit ? "Sem permissao para editar este atendimento." : "Sem permissao para ver este atendimento.");
    }

    public PanacheQuery<SocialAssistanceRecord> filtered(SocialServiceType serviceType, Long teamId,
                                                         Long responsibleUserId, String neighborhood,
                                                         OffsetDateTime from, OffsetDateTime to) {
        AppUser user = currentUser.entity();
        List<String> where = new ArrayList<>();
        Parameters params = new Parameters();

        if (!currentUser.isAdmin()) {
            Set<Long> visibleTeamIds = visibleSocialTeamIds(user);
            if (visibleTeamIds.isEmpty()) {
                where.add("id = -1");
            } else {
                where.add("team.id in :visibleTeamIds");
                params.and("visibleTeamIds", visibleTeamIds);
            }
        }
        if (serviceType != null) {
            where.add("serviceType = :serviceType");
            params.and("serviceType", serviceType);
        }
        if (teamId != null) {
            where.add("team.id = :teamId");
            params.and("teamId", teamId);
        }
        if (responsibleUserId != null) {
            where.add("responsibleUser.id = :responsibleUserId");
            params.and("responsibleUserId", responsibleUserId);
        }
        if (neighborhood != null && !neighborhood.isBlank()) {
            where.add("lower(neighborhood) like :neighborhood");
            params.and("neighborhood", "%" + neighborhood.toLowerCase() + "%");
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
        return map.isEmpty() ? records.find(query) : records.find(query, map);
    }

    public SocialAssistanceDtos.SocialAssistanceSummary summary(SocialServiceType serviceType, Long teamId,
                                                                Long responsibleUserId, String neighborhood,
                                                                OffsetDateTime from, OffsetDateTime to) {
        List<SocialAssistanceRecord> rows = filtered(serviceType, teamId, responsibleUserId, neighborhood, from, to).list();
        long totalPeople = rows.stream().mapToLong(row -> row.quantity == null ? 1 : row.quantity).sum();
        return new SocialAssistanceDtos.SocialAssistanceSummary(
                totalPeople,
                rows.size(),
                count(rows, row -> label(row.serviceType), true),
                count(rows, row -> row.team == null ? "Sem equipe" : row.team.name, true),
                count(rows, row -> row.responsibleUser == null ? "Sem responsavel" : row.responsibleUser.name, true),
                count(rows, row -> blankLabel(row.neighborhood), true),
                count(rows, row -> row.createdAt == null ? "-" : row.createdAt.toLocalDate().toString(), false)
        );
    }

    public Set<Long> visibleSocialTeamIds(AppUser user) {
        Set<Long> ids = new LinkedHashSet<>();
        if (user.team != null && user.team.teamType == TeamType.SOCIAL_ACTION) {
            ids.add(user.team.id);
        }
        memberships.find("user.id = ?1 and team.teamType = ?2 order by team.name", user.id, TeamType.SOCIAL_ACTION)
                .list()
                .forEach(membership -> ids.add(membership.team.id));
        return ids;
    }

    public static String label(SocialServiceType type) {
        if (type == null) {
            return "-";
        }
        return switch (type) {
            case MEDICAL -> "Atendimento medico";
            case DENTAL -> "Atendimento odontologico";
            case HAIRCUT -> "Corte de cabelo";
            case MANICURE -> "Manicure";
            case SPEECH_THERAPY -> "Fonoaudiologia";
            case NUTRITION -> "Nutricao";
            case FOOD_BASKET -> "Cesta basica";
            case OTHER -> "Outro atendimento";
        };
    }

    private void apply(SocialAssistanceDtos.SocialAssistanceRequest request, SocialAssistanceRecord record) {
        record.assistedPersonName = request.assistedPersonName();
        record.phone = request.phone();
        record.age = request.age();
        record.neighborhood = request.neighborhood();
        record.city = request.city();
        record.serviceType = request.serviceType();
        record.notes = request.notes();
    }

    private Team resolveSocialTeam(AppUser user, Long requestedTeamId) {
        if (currentUser.isAdmin()) {
            if (requestedTeamId == null) {
                throw new IllegalArgumentException("Informe a equipe de acao social responsavel pelo atendimento.");
            }
            return teams.findByIdOptional(requestedTeamId)
                    .filter(team -> team.teamType == TeamType.SOCIAL_ACTION)
                    .orElseThrow(() -> new IllegalArgumentException("Escolha uma equipe de acao social."));
        }

        Set<Long> visibleIds = visibleSocialTeamIds(user);
        if (visibleIds.isEmpty()) {
            throw new IllegalArgumentException("Este usuario precisa estar vinculado a uma equipe de acao social.");
        }
        Long teamId = requestedTeamId != null && visibleIds.contains(requestedTeamId)
                ? requestedTeamId
                : visibleIds.iterator().next();
        return teams.findByIdOptional(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Equipe de acao social nao encontrada."));
    }

    private List<SocialAssistanceDtos.CountItem> count(List<SocialAssistanceRecord> rows,
                                                       java.util.function.Function<SocialAssistanceRecord, String> classifier,
                                                       boolean quantitySum) {
        Map<String, Long> values = new LinkedHashMap<>();
        rows.forEach(row -> values.merge(classifier.apply(row), quantitySum ? (long) safeQuantity(row) : 1L, Long::sum));
        return values.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(entry -> new SocialAssistanceDtos.CountItem(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    private int safeQuantity(SocialAssistanceRecord record) {
        return record.quantity == null || record.quantity < 1 ? 1 : record.quantity;
    }

    private String blankLabel(String value) {
        return value == null || value.isBlank() ? "Nao informado" : value;
    }

    private String snapshot(SocialAssistanceRecord record) {
        return "{\"assistedPersonName\":\"" + safe(record.assistedPersonName)
                + "\",\"serviceType\":\"" + safe(label(record.serviceType))
                + "\",\"quantity\":" + safeQuantity(record)
                + ",\"team\":\"" + safe(record.team == null ? null : record.team.name)
                + "\",\"responsible\":\"" + safe(record.responsibleUser == null ? null : record.responsibleUser.email) + "\"}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
