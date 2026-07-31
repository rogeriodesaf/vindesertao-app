package org.vindesertao.territory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

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
            boolean enforceForProjectists,
            boolean generated,
            String distributionVersion,
            OffsetDateTime publishedAt,
            long houseCount,
            long locatedHouseCount,
            String coverageStatus
    ) {
        public static TerritoryResponse from(Territory territory, long houseCount, long locatedHouseCount) {
            return new TerritoryResponse(
                    territory.id,
                    territory.name,
                    territory.team.id,
                    territory.team.name,
                    territory.color,
                    territory.polygonGeoJson,
                    territory.active,
                    territory.enforceForProjectists,
                    territory.generated,
                    territory.distributionVersion,
                    territory.publishedAt,
                    houseCount,
                    locatedHouseCount,
                    houseCount == 0 ? "SEM_CASAS" : locatedHouseCount == houseCount ? "COMPLETA" : "PARCIAL"
            );
        }
    }

    public record DistributionRequest(
            @NotNull List<Long> teamIds,
            Map<Long, Long> visitAssignments
    ) {
    }

    public record DistributionHouse(
            Long visitId,
            String personName,
            String street,
            String number,
            String neighborhood,
            Double latitude,
            Double longitude,
            Long teamId
    ) {
    }

    public record DistributionArea(
            Long teamId,
            String teamName,
            String color,
            String polygonGeoJson,
            long houseCount,
            long locatedHouseCount,
            String coverageStatus,
            List<DistributionHouse> houses
    ) {
    }

    public record DistributionPlan(
            Long draftId,
            String version,
            OffsetDateTime generatedAt,
            int requestedTeamCount,
            long totalHouses,
            long locatedHouses,
            long unlocatedHouses,
            long minimumHouses,
            long maximumHouses,
            boolean imbalanced,
            List<DistributionArea> areas
    ) {
    }
}
