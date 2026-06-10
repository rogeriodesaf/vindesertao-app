package org.vindesertao.user;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.AuthService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@ApplicationScoped
public class UserService {
    @Inject
    UserRepository users;

    @Inject
    TeamRepository teams;

    @Inject
    AuthService authService;

    @Inject
    CurrentUser currentUser;

    @Inject
    UserTeamHistoryRepository teamHistory;

    @Inject
    UserTeamMembershipRepository memberships;

    @Inject
    AuditService auditService;

    @Transactional
    public AppUser create(UserDtos.CreateUserRequest request) {
        users.findByEmail(request.email()).ifPresent(existing -> {
            throw new IllegalArgumentException("E-mail ja cadastrado.");
        });
        AppUser user = new AppUser();
        user.name = request.name();
        user.email = request.email().toLowerCase();
        user.passwordHash = authService.hashPassword(request.password());
        user.roles = rolesToString(request.roles());
        user.team = findTeam(request.teamId());
        user.active = request.active();
        user.canRegisterVisits = request.canRegisterVisits();
        user.canViewReports = request.canViewReports();
        user.canAccessFinance = request.canAccessFinance();
        user.mustChangePassword = true;
        user.createdAt = OffsetDateTime.now();
        users.persist(user);
        syncMemberships(user, request.additionalTeamIds());
        auditService.log("CREATE", "USER", user.id, null, snapshot(user));
        return user;
    }

    @Transactional
    public AppUser update(Long id, UserDtos.UpdateUserRequest request) {
        AppUser user = users.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado."));
        String before = snapshot(user);
        Team oldTeam = user.team;
        user.name = request.name();
        user.roles = rolesToString(request.roles());
        Team newTeam = findTeam(request.teamId());
        user.team = newTeam;
        user.active = request.active();
        user.canRegisterVisits = request.canRegisterVisits();
        user.canViewReports = request.canViewReports();
        user.canAccessFinance = request.canAccessFinance();
        user.updatedAt = OffsetDateTime.now();
        if (request.password() != null && !request.password().isBlank()) {
            if (request.password().length() < 8) {
                throw new IllegalArgumentException("A senha deve ter pelo menos 8 caracteres.");
            }
            user.passwordHash = authService.hashPassword(request.password());
            user.mustChangePassword = true;
        }
        if (!sameTeam(oldTeam, newTeam)) {
            recordTeamHistory(user, oldTeam, newTeam);
        }
        syncMemberships(user, request.additionalTeamIds());
        auditService.log("UPDATE", "USER", user.id, before, snapshot(user));
        return user;
    }

    public UserDtos.UserResponse toResponse(AppUser user) {
        return UserDtos.UserResponse.from(user, memberships(user.id));
    }

    public List<UserTeamHistory> teamHistory(Long userId) {
        return teamHistory.find("user.id = ?1 order by changedAt desc", userId).list();
    }

    public List<UserTeamMembership> memberships(Long userId) {
        return memberships.find("user.id = ?1 order by team.name", userId).list();
    }

    public UserDtos.UserSummaryResponse summary() {
        List<AppUser> all = users.findAll().list();
        Map<String, Long> byRole = new LinkedHashMap<>();
        Map<String, Long> byTeamType = new LinkedHashMap<>();
        Map<String, Long> byAccess = new LinkedHashMap<>();
        all.forEach(user -> {
            user.roleSet().forEach(role -> byRole.merge(roleLabel(role), 1L, Long::sum));
            String teamType = user.team == null ? "Sem equipe" : teamTypeLabel(user.team.teamType.name());
            byTeamType.merge(teamType, 1L, Long::sum);
            if (user.canRegisterVisits) {
                byAccess.merge("Podem registrar visitas", 1L, Long::sum);
            }
            if (user.canViewReports) {
                byAccess.merge("Podem ver relatorios", 1L, Long::sum);
            }
            if (user.canAccessFinance) {
                byAccess.merge("Podem acessar financeiro", 1L, Long::sum);
            }
            if (!user.canRegisterVisits && !user.canViewReports && !user.canAccessFinance) {
                byAccess.merge("Apoio sem acesso operacional", 1L, Long::sum);
            }
        });
        return new UserDtos.UserSummaryResponse(items(byRole), items(byTeamType), items(byAccess));
    }

    private Team findTeam(Long teamId) {
        if (teamId == null) {
            return null;
        }
        return teams.findByIdOptional(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Equipe invalida."));
    }

    private String rolesToString(Set<Role> roles) {
        return roles.stream().map(Role::name).sorted().collect(Collectors.joining(","));
    }

    private boolean sameTeam(Team left, Team right) {
        Long leftId = left == null ? null : left.id;
        Long rightId = right == null ? null : right.id;
        return leftId == null ? rightId == null : leftId.equals(rightId);
    }

    private void recordTeamHistory(AppUser user, Team oldTeam, Team newTeam) {
        AppUser actor = currentUser.entity();
        UserTeamHistory history = new UserTeamHistory();
        history.user = user;
        history.oldTeam = oldTeam;
        history.oldTeamName = oldTeam == null ? null : oldTeam.name;
        history.newTeam = newTeam;
        history.newTeamName = newTeam == null ? null : newTeam.name;
        history.changedBy = actor;
        history.changedByEmail = actor.email;
        teamHistory.persist(history);
    }

    private void syncMemberships(AppUser user, List<Long> teamIds) {
        memberships.delete("user.id", user.id);
        if (teamIds == null) {
            return;
        }
        List<Long> unique = teamIds.stream()
                .filter(id -> id != null && (user.team == null || !id.equals(user.team.id)))
                .distinct()
                .toList();
        unique.forEach(teamId -> {
            UserTeamMembership membership = new UserTeamMembership();
            membership.user = user;
            membership.team = findTeam(teamId);
            memberships.persist(membership);
        });
    }

    private String snapshot(AppUser user) {
        List<String> extraTeams = new ArrayList<>();
        if (user.id != null) {
            extraTeams = memberships(user.id).stream().map(membership -> membership.team.name).toList();
        }
        return "{\"name\":\"" + safe(user.name) + "\",\"email\":\"" + safe(user.email) + "\",\"roles\":\""
                + safe(user.roles) + "\",\"team\":\"" + safe(user.team == null ? null : user.team.name)
                + "\",\"additionalTeams\":\"" + safe(String.join(", ", extraTeams))
                + "\",\"active\":" + user.active + ",\"canRegisterVisits\":" + user.canRegisterVisits
                + ",\"canViewReports\":" + user.canViewReports + ",\"canAccessFinance\":" + user.canAccessFinance
                + ",\"mustChangePassword\":" + user.mustChangePassword + "}";
    }

    private List<UserDtos.UserSummaryItem> items(Map<String, Long> map) {
        return map.entrySet().stream()
                .map(entry -> new UserDtos.UserSummaryItem(entry.getKey(), entry.getValue()))
                .toList();
    }

    private String roleLabel(String role) {
        return switch (role) {
            case "admin" -> "Administradores";
            case "lider" -> "Lideres";
            case "projetista" -> "Projetistas";
            default -> role;
        };
    }

    private String teamTypeLabel(String value) {
        return switch (value) {
            case "EVANGELISM" -> "Evangelismo";
            case "SUPPORT" -> "Apoio";
            case "SOCIAL_ACTION" -> "Acao social";
            case "CHILDREN" -> "Infantil";
            case "KITCHEN" -> "Cozinha";
            case "MUSIC" -> "Musica";
            case "INTERCESSION" -> "Intercessao";
            case "MEDIA" -> "Midias";
            case "SECRETARIAT" -> "Secretaria";
            case "FINANCE" -> "Financeiro";
            default -> "Outro";
        };
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
