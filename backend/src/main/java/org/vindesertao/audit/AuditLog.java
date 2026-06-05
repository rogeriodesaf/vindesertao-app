package org.vindesertao.audit;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    public AppUser actor;

    @Column(name = "actor_email", length = 180)
    public String actorEmail;

    @Column(nullable = false, length = 80)
    public String action;

    @Column(name = "entity_type", nullable = false, length = 80)
    public String entityType;

    @Column(name = "entity_id")
    public Long entityId;

    @Column(name = "before_data")
    public String beforeData;

    @Column(name = "after_data")
    public String afterData;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
