package org.vindesertao.audit;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class AuditLogRepository implements PanacheRepository<AuditLog> {
}
