package org.vindesertao.team;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;
import org.vindesertao.user.UserTeamMembershipRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

@ApplicationScoped
public class TeamService {
    @Inject
    TeamRepository teams;

    @Inject
    UserRepository users;

    @Inject
    UserTeamMembershipRepository memberships;

    @Inject
    CurrentUser currentUser;

    @Inject
    AuditService auditService;

    public List<Team> list() {
        return teams.find("order by name").list();
    }

    public TeamDtos.TeamDetailResponse mine() {
        Team team = visibleTeamFor(currentUser.entity());
        return new TeamDtos.TeamDetailResponse(TeamDtos.TeamResponse.from(team), membersOf(team));
    }

    @Transactional
    public Team create(TeamDtos.TeamRequest request) {
        Team team = new Team();
        apply(request, team);
        teams.persist(team);
        syncLeaderMainTeam(team);
        auditService.log("CREATE", "TEAM", team.id, null, snapshot(team));
        return team;
    }

    @Transactional
    public Team update(Long id, TeamDtos.TeamRequest request) {
        Team team = teams.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Equipe nao encontrada."));
        String before = snapshot(team);
        apply(request, team);
        syncLeaderMainTeam(team);
        auditService.log("UPDATE", "TEAM", team.id, before, snapshot(team));
        return team;
    }

    private void apply(TeamDtos.TeamRequest request, Team team) {
        team.name = request.name();
        team.leader = findLeader(request.leaderId());
        team.teamType = request.teamType() == null ? TeamType.OTHER : request.teamType();
        team.canRegisterVisits = request.canRegisterVisits();
    }

    private AppUser findLeader(Long leaderId) {
        if (leaderId == null) {
            return null;
        }
        AppUser leader = users.findByIdOptional(leaderId)
                .orElseThrow(() -> new IllegalArgumentException("Lider invalido."));
        if (!leader.active) {
            throw new IllegalArgumentException("O lider selecionado precisa estar ativo.");
        }
        if (leader.hasRole("admin")) {
            throw new IllegalArgumentException("O administrador nao deve ser lider de equipe operacional.");
        }
        return leader;
    }

    private void syncLeaderMainTeam(Team team) {
        if (team.leader == null) {
            return;
        }
        team.leader.team = team;
        addLeaderRole(team.leader);
        team.leader.canRegisterVisits = team.canRegisterVisits;
        team.leader.canViewReports = true;
    }

    private void addLeaderRole(AppUser user) {
        TreeSet<String> roles = new TreeSet<>(user.roleSet());
        roles.add("lider");
        user.roles = String.join(",", roles);
    }

    private Team visibleTeamFor(AppUser user) {
        if (user.team != null && user.team.canRegisterVisits) {
            return user.team;
        }
        return memberships.find("user.id = ?1 and team.canRegisterVisits = true order by team.name", user.id)
                .firstResultOptional()
                .map(membership -> membership.team)
                .or(() -> user.team == null
                        ? memberships.find("user.id = ?1 order by team.name", user.id)
                        .firstResultOptional()
                        .map(membership -> membership.team)
                        : java.util.Optional.of(user.team))
                .orElseThrow(() -> new NotFoundException("Nenhuma equipe vinculada ao seu usuario."));
    }

    private List<TeamDtos.TeamMemberResponse> membersOf(Team team) {
        Map<Long, AppUser> members = new LinkedHashMap<>();
        users.find("active = true and team.id = ?1 order by name", team.id)
                .list()
                .forEach(user -> members.put(user.id, user));
        memberships.find("team.id = ?1 and user.active = true order by user.name", team.id)
                .list()
                .forEach(membership -> members.putIfAbsent(membership.user.id, membership.user));
        return members.values().stream()
                .map(user -> TeamDtos.TeamMemberResponse.from(user, team))
                .toList();
    }

    private String snapshot(Team team) {
        return "{\"name\":\"" + safe(team.name) + "\",\"leader\":\""
                + safe(team.leader == null ? null : team.leader.email) + "\",\"teamType\":\""
                + team.teamType + "\",\"canRegisterVisits\":" + team.canRegisterVisits + "}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
