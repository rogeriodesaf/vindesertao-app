package org.vindesertao.team;

import jakarta.validation.constraints.NotBlank;

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
}
