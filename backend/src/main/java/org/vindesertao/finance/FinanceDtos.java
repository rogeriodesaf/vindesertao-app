package org.vindesertao.finance;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public class FinanceDtos {
    public record FinancialTransactionRequest(
            @NotNull FinancialTransactionType type,
            @NotBlank String category,
            @NotBlank String description,
            @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
            String paymentMethod,
            @NotNull LocalDate transactionDate,
            String notes
    ) {
    }

    public record FinancialTransactionResponse(
            Long id,
            FinancialTransactionType type,
            String typeLabel,
            String category,
            String description,
            BigDecimal amount,
            String paymentMethod,
            LocalDate transactionDate,
            String notes,
            Long responsibleUserId,
            String responsibleUserName,
            OffsetDateTime createdAt,
            String createdBy,
            OffsetDateTime updatedAt,
            String updatedBy
    ) {
        public static FinancialTransactionResponse from(FinancialTransaction transaction) {
            return new FinancialTransactionResponse(
                    transaction.id,
                    transaction.type,
                    FinanceService.typeLabel(transaction.type),
                    transaction.category,
                    transaction.description,
                    transaction.amount,
                    transaction.paymentMethod,
                    transaction.transactionDate,
                    transaction.notes,
                    transaction.responsibleUser == null ? null : transaction.responsibleUser.id,
                    transaction.responsibleUser == null ? null : transaction.responsibleUser.name,
                    transaction.createdAt,
                    transaction.createdBy,
                    transaction.updatedAt,
                    transaction.updatedBy
            );
        }
    }

    public record CountItem(String label, BigDecimal total) {
    }

    public record FinanceSummary(
            BigDecimal totalIncome,
            BigDecimal totalExpense,
            BigDecimal balance,
            long totalTransactions,
            List<CountItem> byCategory,
            List<CountItem> byPaymentMethod,
            List<CountItem> byPeriod
    ) {
    }
}
