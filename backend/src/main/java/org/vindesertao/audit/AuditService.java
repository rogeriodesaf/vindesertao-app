package org.vindesertao.audit;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.user.AppUser;

@ApplicationScoped
public class AuditService {
    @Inject
    AuditLogRepository logs;

    @Inject
    CurrentUser currentUser;

    @Transactional(Transactional.TxType.MANDATORY)
    public void log(String action, String entityType, Long entityId, String beforeData, String afterData) {
        AppUser actor = null;
        try {
            actor = currentUser.entity();
        } catch (RuntimeException ignored) {
            // Some tests and seed paths may not have a JWT-backed current user.
        }
        AuditLog log = new AuditLog();
        log.actor = actor;
        log.actorEmail = actor == null ? "sistema" : actor.email;
        log.action = action;
        log.entityType = entityType;
        log.entityId = entityId;
        log.beforeData = beforeData;
        log.afterData = afterData;
        logs.persist(log);
    }
}
