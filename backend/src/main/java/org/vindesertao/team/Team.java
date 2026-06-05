package org.vindesertao.team;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.vindesertao.user.AppUser;

@Entity
@Table(name = "teams")
public class Team extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(nullable = false, unique = true, length = 120)
    public String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "leader_id")
    public AppUser leader;

    @Enumerated(EnumType.STRING)
    @Column(name = "team_type", nullable = false, length = 40)
    public TeamType teamType = TeamType.EVANGELISM;

    @Column(name = "can_register_visits", nullable = false)
    public boolean canRegisterVisits = true;
}
