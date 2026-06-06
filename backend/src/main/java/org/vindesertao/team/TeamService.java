package org.vindesertao.team;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

import java.util.List;
import java.util.TreeSet;

@ApplicationScoped
public class TeamService {
    @Inject
    TeamRepository teams;

    @Inject
    UserRepository users;

    @Inject
    AuditService auditService;

    public List<Team> list() {
        return teams.find("order by name").list();
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

    private String snapshot(Team team) {
        return "{\"name\":\"" + safe(team.name) + "\",\"leader\":\""
                + safe(team.leader == null ? null : team.leader.email) + "\",\"teamType\":\""
                + team.teamType + "\",\"canRegisterVisits\":" + team.canRegisterVisits + "}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
