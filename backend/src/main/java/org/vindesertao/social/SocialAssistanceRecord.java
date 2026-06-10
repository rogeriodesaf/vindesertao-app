package org.vindesertao.social;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.vindesertao.team.Team;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;

@Entity
@Table(name = "social_assistance_records")
public class SocialAssistanceRecord extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(name = "assisted_person_name", nullable = false, length = 160)
    public String assistedPersonName;

    @Column(length = 40)
    public String phone;

    public Integer age;

    @Column(length = 120)
    public String neighborhood;

    @NotBlank
    @Column(nullable = false, length = 120)
    public String city;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "service_type", nullable = false, length = 60)
    public SocialServiceType serviceType;

    @Column(nullable = false)
    public Integer quantity = 1;

    @Column(columnDefinition = "TEXT")
    public String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_user_id", nullable = false)
    public AppUser responsibleUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    public Team team;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "created_by", nullable = false, length = 180)
    public String createdBy;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    @Column(name = "updated_by", length = 180)
    public String updatedBy;
}
