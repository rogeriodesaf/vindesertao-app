package org.vindesertao.analytics;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;
import org.vindesertao.team.TeamType;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class AnalyticsService {
    @Inject
    EntityManager em;

    @Inject
    CurrentUser currentUser;

    @Inject
    TeamRepository teams;

    public AnalyticsDtos.DashboardResponse dashboard(OffsetDateTime from, OffsetDateTime to) {
        AppUser user = currentUser.entity();
        String scope = scopeClause(user);
        List<String> filters = new ArrayList<>();
        if (!scope.isBlank()) {
            filters.add(scope);
        }
        if (from != null) {
            filters.add("v.createdAt >= :from");
        }
        if (to != null) {
            filters.add("v.createdAt <= :to");
        }
        String where = filters.isEmpty() ? "" : " where " + String.join(" and ", filters);

        long total = count("select count(v) from HouseholdVisit v" + where, from, to, user);
        long yes = count("select count(v) from HouseholdVisit v" + addWhere(where, "v.wantsVisits = true"), from, to, user);
        long no = count("select count(v) from HouseholdVisit v" + addWhere(where, "v.wantsVisits = false"), from, to, user);

        return new AnalyticsDtos.DashboardResponse(
                total,
                yes,
                no,
                grouped("select v.responsibleUser.name, count(v) from HouseholdVisit v" + where + " group by v.responsibleUser.name order by count(v) desc", from, to, user),
                grouped("select coalesce(v.team.name, 'Sem equipe'), count(v) from HouseholdVisit v" + where + " group by v.team.name order by count(v) desc", from, to, user),
                grouped("select coalesce(v.neighborhood, 'Sem bairro'), count(v) from HouseholdVisit v" + where + " group by v.neighborhood order by count(v) desc", from, to, user),
                grouped("select function('to_char', v.createdAt, 'YYYY-MM-DD'), count(v) from HouseholdVisit v" + where + " group by function('to_char', v.createdAt, 'YYYY-MM-DD') order by function('to_char', v.createdAt, 'YYYY-MM-DD')", from, to, user),
                teamReports(from, to, user)
        );
    }

    private String scopeClause(AppUser user) {
        if (currentUser.isAdmin()) {
            return "";
        }
        if (currentUser.isLeader() || user.canViewReports) {
            return "v.team.id = :teamId";
        }
        return "v.responsibleUser.id = :userId";
    }

    private String addWhere(String where, String clause) {
        return where.isBlank() ? " where " + clause : where + " and " + clause;
    }

    private long count(String jpql, OffsetDateTime from, OffsetDateTime to, AppUser user) {
        var query = em.createQuery(jpql, Long.class);
        bind(query, from, to, user);
        return query.getSingleResult();
    }

    private List<AnalyticsDtos.CountItem> grouped(String jpql, OffsetDateTime from, OffsetDateTime to, AppUser user) {
        var query = em.createQuery(jpql, Object[].class);
        bind(query, from, to, user);
        return query.getResultList().stream()
                .map(row -> new AnalyticsDtos.CountItem(String.valueOf(row[0]), (Long) row[1]))
                .toList();
    }

    private List<AnalyticsDtos.TeamReportItem> teamReports(OffsetDateTime from, OffsetDateTime to, AppUser user) {
        return teamsForReport(user).stream()
                .map(team -> new AnalyticsDtos.TeamReportItem(
                        team.id,
                        team.name,
                        countForTeam(team.id, null, from, to),
                        countForTeam(team.id, true, from, to),
                        countForTeam(team.id, false, from, to)))
                .toList();
    }

    private List<Team> teamsForReport(AppUser user) {
        if (currentUser.isAdmin()) {
            return teams.find("teamType = ?1 and canRegisterVisits = true order by name", TeamType.EVANGELISM).list();
        }
        if ((currentUser.isLeader() || user.canViewReports) && isEvangelismTeam(user.team)) {
            return List.of(user.team);
        }
        return List.of();
    }

    private boolean isEvangelismTeam(Team team) {
        return team != null && team.canRegisterVisits && team.teamType == TeamType.EVANGELISM;
    }

    private long countForTeam(Long teamId, Boolean wantsVisits, OffsetDateTime from, OffsetDateTime to) {
        List<String> filters = new ArrayList<>();
        filters.add("v.team.id = :teamId");
        if (wantsVisits != null) {
            filters.add("v.wantsVisits = :wantsVisits");
        }
        if (from != null) {
            filters.add("v.createdAt >= :from");
        }
        if (to != null) {
            filters.add("v.createdAt <= :to");
        }
        var query = em.createQuery("select count(v) from HouseholdVisit v where " + String.join(" and ", filters), Long.class);
        query.setParameter("teamId", teamId);
        if (wantsVisits != null) {
            query.setParameter("wantsVisits", wantsVisits);
        }
        if (from != null) {
            query.setParameter("from", from);
        }
        if (to != null) {
            query.setParameter("to", to);
        }
        return query.getSingleResult();
    }

    private void bind(jakarta.persistence.Query query, OffsetDateTime from, OffsetDateTime to, AppUser user) {
        if (!currentUser.isAdmin() && (currentUser.isLeader() || user.canViewReports)) {
            query.setParameter("teamId", user.team == null ? -1L : user.team.id);
        }
        if (!currentUser.isAdmin() && !currentUser.isLeader() && !user.canViewReports) {
            query.setParameter("userId", user.id);
        }
        if (from != null) {
            query.setParameter("from", from);
        }
        if (to != null) {
            query.setParameter("to", to);
        }
    }
}
