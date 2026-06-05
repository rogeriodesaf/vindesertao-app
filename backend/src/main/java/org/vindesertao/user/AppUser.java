package org.vindesertao.user;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.vindesertao.team.Team;

import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "app_users")
public class AppUser extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(nullable = false, length = 160)
    public String name;

    @Email
    @NotBlank
    @Column(nullable = false, unique = true, length = 180)
    public String email;

    @Column(name = "password_hash", nullable = false, length = 100)
    public String passwordHash;

    @Column(nullable = false, length = 255)
    public String roles;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    public Team team;

    @Column(nullable = false)
    public boolean active = true;

    @Column(name = "must_change_password", nullable = false)
    public boolean mustChangePassword = false;

    @Column(name = "can_register_visits", nullable = false)
    public boolean canRegisterVisits = true;

    @Column(name = "can_view_reports", nullable = false)
    public boolean canViewReports = false;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    public Set<String> roleSet() {
        return Arrays.stream(roles.split(","))
                .map(String::trim)
                .filter(role -> !role.isBlank())
                .collect(Collectors.toSet());
    }

    public boolean hasRole(String role) {
        return roleSet().contains(role);
    }
}
