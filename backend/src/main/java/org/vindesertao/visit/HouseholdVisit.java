package org.vindesertao.visit;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.vindesertao.team.Team;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;

@Entity
@Table(name = "household_visits")
public class HouseholdVisit extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(name = "person_name", nullable = false, length = 160)
    public String personName;

    @Column(length = 40)
    public String phone;

    @Column(length = 180)
    public String street;

    @Column(length = 40)
    public String number;

    @Column(length = 120)
    public String neighborhood;

    @NotBlank
    @Column(nullable = false, length = 120)
    public String city;

    @Column(name = "manual_address")
    public String manualAddress;

    public Double latitude;
    public Double longitude;

    @NotNull
    @Column(name = "wants_visits", nullable = false)
    public Boolean wantsVisits;

    @Column(name = "person_age")
    public Integer personAge;

    @Column(name = "household_size")
    public Integer householdSize;

    @Column(name = "reference_point")
    public String referencePoint;

    @Column(name = "prayer_request")
    public String prayerRequest;

    @Column(name = "next_visit_at")
    public OffsetDateTime nextVisitAt;

    public String notes;

    @Column(name = "photo_data")
    public String photoData;

    @Column(name = "photo_content_type", length = 80)
    public String photoContentType;

    @Column(name = "photo_file_name", length = 180)
    public String photoFileName;

    @Column(name = "photo_url")
    public String photoUrl;

    @Column(name = "photo_public_id", length = 220)
    public String photoPublicId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_user_id", nullable = false)
    public AppUser responsibleUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    public Team team;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "created_by", nullable = false, length = 180)
    public String createdBy;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    @Column(name = "updated_by", length = 180)
    public String updatedBy;
}
