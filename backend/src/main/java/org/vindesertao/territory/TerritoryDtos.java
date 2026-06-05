package org.vindesertao.territory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TerritoryDtos {
    public record TerritoryRequest(
            @NotBlank String name,
            @NotNull Long teamId,
            @NotBlank String color,
            @NotBlank String polygonGeoJson,
            boolean active,
            boolean enforceForProjectists
    ) {
    }

    public record TerritoryResponse(
            Long id,
            String name,
            Long teamId,
            String teamName,
            String color,
            String polygonGeoJson,
            boolean active,
            boolean enforceForProjectists
    ) {
        public static TerritoryResponse from(Territory territory) {
            return new TerritoryResponse(
                    territory.id,
                    territory.name,
                    territory.team.id,
                    territory.team.name,
                    territory.color,
                    territory.polygonGeoJson,
                    territory.active,
                    territory.enforceForProjectists
            );
        }
    }
}
