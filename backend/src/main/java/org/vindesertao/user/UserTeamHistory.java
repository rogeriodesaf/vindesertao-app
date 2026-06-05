package org.vindesertao.user;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import org.vindesertao.team.Team;

import java.time.OffsetDateTime;

@Entity
@Table(name = "user_team_history")
public class UserTeamHistory extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    public AppUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "old_team_id")
    public Team oldTeam;

    @Column(name = "old_team_name", length = 120)
    public String oldTeamName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_team_id")
    public Team newTeam;

    @Column(name = "new_team_name", length = 120)
    public String newTeamName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by_user_id")
    public AppUser changedBy;

    @Column(name = "changed_by_email", length = 180)
    public String changedByEmail;

    @Column(name = "changed_at", nullable = false)
    public OffsetDateTime changedAt = OffsetDateTime.now();
}
