package org.vindesertao.territory;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.vindesertao.team.Team;

import java.time.OffsetDateTime;

@Entity
@Table(name = "territories")
public class Territory extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(nullable = false, length = 140)
    public String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    public Team team;

    @Column(nullable = false, length = 20)
    public String color = "#276749";

    @Column(name = "polygon_geojson", nullable = false)
    public String polygonGeoJson;

    @Column(nullable = false)
    public boolean active = true;

    @Column(name = "enforce_for_projectists", nullable = false)
    public boolean enforceForProjectists = false;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;
}
