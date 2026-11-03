package org.vindesertao.edition;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.vindesertao.team.Team;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;

@Entity
@Table(name = "edition_access", uniqueConstraints = @UniqueConstraint(columnNames = {"edition_id", "user_id"}))
public class EditionAccess extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "edition_id", nullable = false)
    public Edition edition;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    public AppUser user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id")
    public Team team;
    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();
}
