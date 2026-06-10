package org.vindesertao.social;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.List;

public class SocialAssistanceDtos {
    public record SocialAssistanceRequest(
            @NotBlank String assistedPersonName,
            String phone,
            Integer age,
            String neighborhood,
            @NotBlank String city,
            @NotNull SocialServiceType serviceType,
            @Min(1) Integer quantity,
            String notes,
            Long teamId
    ) {
    }

    public record SocialAssistanceResponse(
            Long id,
            String assistedPersonName,
            String phone,
            Integer age,
            String neighborhood,
            String city,
            SocialServiceType serviceType,
            String serviceTypeLabel,
            Integer quantity,
            String notes,
            Long responsibleUserId,
            String responsibleUserName,
            Long teamId,
            String teamName,
            OffsetDateTime createdAt,
            String createdBy,
            OffsetDateTime updatedAt,
            String updatedBy
    ) {
        public static SocialAssistanceResponse from(SocialAssistanceRecord record) {
            return new SocialAssistanceResponse(
                    record.id,
                    record.assistedPersonName,
                    record.phone,
                    record.age,
                    record.neighborhood,
                    record.city,
                    record.serviceType,
                    SocialAssistanceService.label(record.serviceType),
                    record.quantity,
                    record.notes,
                    record.responsibleUser == null ? null : record.responsibleUser.id,
                    record.responsibleUser == null ? null : record.responsibleUser.name,
                    record.team == null ? null : record.team.id,
                    record.team == null ? null : record.team.name,
                    record.createdAt,
                    record.createdBy,
                    record.updatedAt,
                    record.updatedBy
            );
        }
    }

    public record CountItem(String label, long total) {
    }

    public record SocialAssistanceSummary(
            long totalPeople,
            long totalRecords,
            List<CountItem> byServiceType,
            List<CountItem> byTeam,
            List<CountItem> byResponsible,
            List<CountItem> byNeighborhood,
            List<CountItem> byPeriod
    ) {
    }
}
