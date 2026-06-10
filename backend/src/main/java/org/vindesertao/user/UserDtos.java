package org.vindesertao.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;

public class UserDtos {
    public record UserResponse(
            Long id,
            String name,
            String email,
            Set<String> roles,
            Long teamId,
            String teamName,
            boolean active,
            boolean mustChangePassword,
            boolean canRegisterVisits,
            boolean canViewReports,
            boolean canAccessFinance,
            boolean canAccessChildren,
            List<Long> additionalTeamIds,
            List<String> additionalTeamNames
    ) {
        public static UserResponse from(AppUser user, List<UserTeamMembership> memberships) {
            return new UserResponse(
                    user.id,
                    user.name,
                    user.email,
                    user.roleSet(),
                    user.team == null ? null : user.team.id,
                    user.team == null ? null : user.team.name,
                    user.active,
                    user.mustChangePassword,
                    user.canRegisterVisits,
                    user.canViewReports,
                    user.canAccessFinance,
                    user.canAccessChildren,
                    memberships.stream().map(membership -> membership.team.id).toList(),
                    memberships.stream().map(membership -> membership.team.name).toList()
            );
        }
    }

    public record CreateUserRequest(
            @NotBlank String name,
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8) String password,
            @NotEmpty Set<Role> roles,
            Long teamId,
            List<Long> additionalTeamIds,
            boolean active,
            boolean canRegisterVisits,
            boolean canViewReports,
            boolean canAccessFinance,
            boolean canAccessChildren
    ) {
    }

    public record UpdateUserRequest(
            @NotBlank String name,
            @NotEmpty Set<Role> roles,
            Long teamId,
            List<Long> additionalTeamIds,
            boolean active,
            boolean canRegisterVisits,
            boolean canViewReports,
            boolean canAccessFinance,
            boolean canAccessChildren,
            String password
    ) {
    }

    public record UserTeamHistoryResponse(
            Long id,
            Long oldTeamId,
            String oldTeamName,
            Long newTeamId,
            String newTeamName,
            String changedByEmail,
            OffsetDateTime changedAt
    ) {
        public static UserTeamHistoryResponse from(UserTeamHistory history) {
            return new UserTeamHistoryResponse(
                    history.id,
                    history.oldTeam == null ? null : history.oldTeam.id,
                    history.oldTeamName,
                    history.newTeam == null ? null : history.newTeam.id,
                    history.newTeamName,
                    history.changedByEmail,
                    history.changedAt
            );
        }
    }

    public record UserSummaryItem(String label, long total) {
    }

    public record UserSummaryResponse(
            List<UserSummaryItem> byRole,
            List<UserSummaryItem> byPrimaryTeamType,
            List<UserSummaryItem> byAccess
    ) {
    }
}
