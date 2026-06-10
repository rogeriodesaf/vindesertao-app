package org.vindesertao.children;

import jakarta.validation.constraints.NotBlank;

import java.time.OffsetDateTime;
import java.util.List;

public class ChildrenDtos {
    public record ChildRequest(
            @NotBlank String childName,
            String guardianName,
            String guardianPhone,
            Integer age,
            String neighborhood,
            @NotBlank String city,
            String activityName,
            String notes
    ) {
    }

    public record ChildResponse(
            Long id,
            String childName,
            String guardianName,
            String guardianPhone,
            Integer age,
            String neighborhood,
            String city,
            String activityName,
            String notes,
            Long responsibleUserId,
            String responsibleUserName,
            OffsetDateTime createdAt,
            String createdBy,
            OffsetDateTime updatedAt,
            String updatedBy
    ) {
        public static ChildResponse from(ChildRecord record) {
            return new ChildResponse(
                    record.id,
                    record.childName,
                    record.guardianName,
                    record.guardianPhone,
                    record.age,
                    record.neighborhood,
                    record.city,
                    record.activityName,
                    record.notes,
                    record.responsibleUser == null ? null : record.responsibleUser.id,
                    record.responsibleUser == null ? null : record.responsibleUser.name,
                    record.createdAt,
                    record.createdBy,
                    record.updatedAt,
                    record.updatedBy
            );
        }
    }

    public record CountItem(String label, long total) {
    }

    public record ChildrenSummary(
            long totalChildren,
            long totalRecords,
            List<CountItem> byActivity,
            List<CountItem> byResponsible,
            List<CountItem> byNeighborhood,
            List<CountItem> byPeriod
    ) {
    }
}
