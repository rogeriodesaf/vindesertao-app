package org.vindesertao.team;

import jakarta.validation.constraints.NotBlank;

import org.vindesertao.user.AppUser;

import java.util.List;
import java.util.Set;

public class TeamDtos {
    public record TeamResponse(
            Long id,
            String name,
            Long leaderId,
            String leaderName,
            TeamType teamType,
            boolean canRegisterVisits
    ) {
        public static TeamResponse from(Team team) {
            return new TeamResponse(
                    team.id,
                    team.name,
                    team.leader == null ? null : team.leader.id,
                    team.leader == null ? null : team.leader.name,
                    team.teamType,
                    team.canRegisterVisits
            );
        }
    }

    public record TeamRequest(
            @NotBlank String name,
            Long leaderId,
            TeamType teamType,
            boolean canRegisterVisits
    ) {
    }

    public record TeamMemberResponse(
            Long id,
            String name,
            String email,
            Set<String> roles,
            boolean leader
    ) {
        public static TeamMemberResponse from(AppUser user, Team team) {
            return new TeamMemberResponse(
                    user.id,
                    user.name,
                    user.email,
                    user.roleSet(),
                    team.leader != null && team.leader.id.equals(user.id)
            );
        }
    }

    public record TeamDetailResponse(
            TeamResponse team,
            List<TeamMemberResponse> members
    ) {
    }
}
