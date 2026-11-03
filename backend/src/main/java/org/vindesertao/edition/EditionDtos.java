package org.vindesertao.edition;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public class EditionDtos {
    public record EditionRequest(Integer year, String name, String locality, LocalDate startsOn, LocalDate endsOn) {}
    public record EditionResponse(Long id, Integer year, String name, String locality, LocalDate startsOn,
                                  LocalDate endsOn, EditionStatus status, OffsetDateTime createdAt) {
        public static EditionResponse from(Edition e) {
            return new EditionResponse(e.id, e.year, e.name, e.locality, e.startsOn, e.endsOn, e.status, e.createdAt);
        }
    }
    public record AccessRequest(Long userId, Long teamId) {}
    public record AccessResponse(Long userId, String userName, Long teamId, String teamName) {}
}
