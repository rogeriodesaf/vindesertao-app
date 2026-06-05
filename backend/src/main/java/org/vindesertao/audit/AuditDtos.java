package org.vindesertao.audit;

import java.time.OffsetDateTime;

public class AuditDtos {
    public record AuditLogResponse(
            Long id,
            String actorEmail,
            String action,
            String entityType,
            Long entityId,
            String beforeData,
            String afterData,
            OffsetDateTime createdAt
    ) {
        public static AuditLogResponse from(AuditLog log) {
            return new AuditLogResponse(log.id, log.actorEmail, log.action, log.entityType, log.entityId,
                    log.beforeData, log.afterData, log.createdAt);
        }
    }
}
