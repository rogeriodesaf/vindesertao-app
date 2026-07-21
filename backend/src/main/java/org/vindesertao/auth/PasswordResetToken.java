package org.vindesertao.auth;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    public AppUser user;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    public String tokenHash;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    public OffsetDateTime expiresAt;

    @Column(name = "used_at")
    public OffsetDateTime usedAt;

    @Column(nullable = false, length = 20)
    public String status = "ACTIVE";
}
