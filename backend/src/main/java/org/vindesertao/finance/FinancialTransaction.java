package org.vindesertao.finance;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.vindesertao.user.AppUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "financial_transactions")
public class FinancialTransaction extends PanacheEntityBase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    public FinancialTransactionType type;

    @NotBlank
    @Column(nullable = false, length = 80)
    public String category;

    @NotBlank
    @Column(nullable = false, length = 220)
    public String description;

    @NotNull
    @Column(nullable = false, precision = 14, scale = 2)
    public BigDecimal amount;

    @Column(name = "payment_method", length = 80)
    public String paymentMethod;

    @NotNull
    @Column(name = "transaction_date", nullable = false)
    public LocalDate transactionDate;

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
