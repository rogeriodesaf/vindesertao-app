package org.vindesertao.edition;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "editions")
public class Edition extends PanacheEntityBase {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotNull @Column(nullable = false)
    public Integer year;

    @NotBlank @Column(nullable = false, length = 160)
    public String name;

    @NotBlank @Column(nullable = false, length = 160)
    public String locality;

    @Column(name = "starts_on")
    public LocalDate startsOn;

    @Column(name = "ends_on")
    public LocalDate endsOn;

    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    public EditionStatus status = EditionStatus.PREPARATION;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;
}
