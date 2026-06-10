package org.vindesertao.children;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.vindesertao.user.AppUser;

import java.time.OffsetDateTime;

@Entity
@Table(name = "children_ministry_records")
public class ChildRecord extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotBlank
    @Column(name = "child_name", nullable = false, length = 160)
    public String childName;

    @Column(name = "guardian_name", length = 160)
    public String guardianName;

    @Column(name = "guardian_phone", length = 40)
    public String guardianPhone;

    public Integer age;

    @Column(length = 120)
    public String neighborhood;

    @NotBlank
    @Column(nullable = false, length = 120)
    public String city;

    @Column(name = "activity_name", length = 160)
    public String activityName;

    @Column(columnDefinition = "TEXT")
    public String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_user_id", nullable = false)
    public AppUser responsibleUser;

    @Column(name = "created_at", nullable = false)
    public OffsetDateTime createdAt;

    @Column(name = "created_by", nullable = false, length = 180)
    public String createdBy;

    @Column(name = "updated_at")
    public OffsetDateTime updatedAt;

    @Column(name = "updated_by", length = 180)
    public String updatedBy;
}
