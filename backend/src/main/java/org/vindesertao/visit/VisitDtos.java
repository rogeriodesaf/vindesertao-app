package org.vindesertao.visit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public class VisitDtos {
    public record VisitRequest(
            @NotBlank String personName,
            String phone,
            String street,
            String number,
            String neighborhood,
            @NotBlank String city,
            String manualAddress,
            Double latitude,
            Double longitude,
            @NotNull Boolean wantsVisits,
            Integer personAge,
            Integer householdSize,
            String referencePoint,
            String prayerRequest,
            OffsetDateTime nextVisitAt,
            String notes,
            String photoData,
            String photoUrl,
            String photoContentType,
            String photoFileName,
            String streetViewUrl
    ) {
    }

    public record VisitResponse(
            Long id,
            String personName,
            String phone,
            String street,
            String number,
            String neighborhood,
            String city,
            String manualAddress,
            Double latitude,
            Double longitude,
            Boolean wantsVisits,
            Integer personAge,
            Integer householdSize,
            String referencePoint,
            String prayerRequest,
            OffsetDateTime nextVisitAt,
            String notes,
            Boolean hasPhoto,
            String photoData,
            String photoUrl,
            String photoContentType,
            String photoFileName,
            String streetViewUrl,
            Long responsibleUserId,
            String responsibleUserName,
            Long teamId,
            OffsetDateTime createdAt,
            String createdBy,
            OffsetDateTime updatedAt,
            String updatedBy
    ) {
        public static VisitResponse from(HouseholdVisit visit) {
            return from(visit, true);
        }

        public static VisitResponse summary(HouseholdVisit visit) {
            return from(visit, false);
        }

        private static VisitResponse from(HouseholdVisit visit, boolean includePhoto) {
            return new VisitResponse(
                    visit.id,
                    visit.personName,
                    visit.phone,
                    visit.street,
                    visit.number,
                    visit.neighborhood,
                    visit.city,
                    visit.manualAddress,
                    visit.latitude,
                    visit.longitude,
                    visit.wantsVisits,
                    visit.personAge,
                    visit.householdSize,
                    visit.referencePoint,
                    visit.prayerRequest,
                    visit.nextVisitAt,
                    visit.notes,
                    hasPhoto(visit),
                    includePhoto && visit.photoUrl == null ? visit.photoData : null,
                    visit.photoUrl,
                    visit.photoContentType,
                    visit.photoFileName,
                    visit.streetViewUrl,
                    visit.responsibleUser == null ? null : visit.responsibleUser.id,
                    visit.responsibleUser == null ? null : visit.responsibleUser.name,
                    visit.team == null ? null : visit.team.id,
                    visit.createdAt,
                    visit.createdBy,
                    visit.updatedAt,
                    visit.updatedBy
            );
        }

        private static boolean hasPhoto(HouseholdVisit visit) {
            return (visit.photoUrl != null && !visit.photoUrl.isBlank())
                    || (visit.photoData != null && !visit.photoData.isBlank());
        }
    }
}
