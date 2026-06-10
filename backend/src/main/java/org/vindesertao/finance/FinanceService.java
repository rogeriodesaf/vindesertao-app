package org.vindesertao.finance;

import io.quarkus.hibernate.orm.panache.PanacheQuery;
import io.quarkus.panache.common.Parameters;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.user.AppUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class FinanceService {
    @Inject
    FinancialTransactionRepository transactions;

    @Inject
    CurrentUser currentUser;

    @Inject
    AuditService auditService;

    @Transactional
    public FinancialTransaction create(FinanceDtos.FinancialTransactionRequest request) {
        AppUser user = requireAccess();
        FinancialTransaction transaction = new FinancialTransaction();
        apply(request, transaction);
        transaction.responsibleUser = user;
        transaction.createdAt = OffsetDateTime.now();
        transaction.createdBy = user.email;
        transactions.persist(transaction);
        auditService.log("CREATE", "FINANCE", transaction.id, null, snapshot(transaction));
        return transaction;
    }

    @Transactional
    public FinancialTransaction update(Long id, FinanceDtos.FinancialTransactionRequest request) {
        AppUser user = requireAccess();
        FinancialTransaction transaction = transactions.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Lancamento financeiro nao encontrado."));
        String before = snapshot(transaction);
        apply(request, transaction);
        transaction.updatedAt = OffsetDateTime.now();
        transaction.updatedBy = user.email;
        auditService.log("UPDATE", "FINANCE", transaction.id, before, snapshot(transaction));
        return transaction;
    }

    public PanacheQuery<FinancialTransaction> filtered(FinancialTransactionType type, String category,
                                                       String paymentMethod, LocalDate from, LocalDate to) {
        requireAccess();
        List<String> where = new ArrayList<>();
        Parameters params = new Parameters();
        if (type != null) {
            where.add("type = :type");
            params.and("type", type);
        }
        if (category != null && !category.isBlank()) {
            where.add("lower(category) like :category");
            params.and("category", "%" + category.toLowerCase() + "%");
        }
        if (paymentMethod != null && !paymentMethod.isBlank()) {
            where.add("lower(paymentMethod) like :paymentMethod");
            params.and("paymentMethod", "%" + paymentMethod.toLowerCase() + "%");
        }
        if (from != null) {
            where.add("transactionDate >= :from");
            params.and("from", from);
        }
        if (to != null) {
            where.add("transactionDate <= :to");
            params.and("to", to);
        }
        String query = where.isEmpty() ? "order by transactionDate desc, id desc" : String.join(" and ", where) + " order by transactionDate desc, id desc";
        Map<String, Object> map = params.map();
        return map.isEmpty() ? transactions.find(query) : transactions.find(query, map);
    }

    public FinanceDtos.FinanceSummary summary(FinancialTransactionType type, String category, String paymentMethod, LocalDate from, LocalDate to) {
        List<FinancialTransaction> rows = filtered(type, category, paymentMethod, from, to).list();
        BigDecimal income = rows.stream()
                .filter(row -> row.type == FinancialTransactionType.INCOME)
                .map(row -> safeAmount(row.amount))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expense = rows.stream()
                .filter(row -> row.type == FinancialTransactionType.EXPENSE)
                .map(row -> safeAmount(row.amount))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new FinanceDtos.FinanceSummary(
                income,
                expense,
                income.subtract(expense),
                rows.size(),
                totals(rows, row -> row.category),
                totals(rows, row -> blank(row.paymentMethod, "Nao informado")),
                totals(rows, row -> row.transactionDate == null ? "-" : row.transactionDate.toString())
        );
    }

    public static String typeLabel(FinancialTransactionType type) {
        if (type == null) {
            return "-";
        }
        return type == FinancialTransactionType.INCOME ? "Entrada" : "Saida";
    }

    private AppUser requireAccess() {
        AppUser user = currentUser.entity();
        if (currentUser.isAdmin() || user.canAccessFinance) {
            return user;
        }
        throw new ForbiddenException("Sem permissao para acessar o financeiro.");
    }

    private void apply(FinanceDtos.FinancialTransactionRequest request, FinancialTransaction transaction) {
        transaction.type = request.type();
        transaction.category = request.category();
        transaction.description = request.description();
        transaction.amount = request.amount();
        transaction.paymentMethod = request.paymentMethod();
        transaction.transactionDate = request.transactionDate();
        transaction.notes = request.notes();
    }

    private List<FinanceDtos.CountItem> totals(List<FinancialTransaction> rows,
                                               java.util.function.Function<FinancialTransaction, String> classifier) {
        Map<String, BigDecimal> values = new LinkedHashMap<>();
        rows.forEach(row -> {
            BigDecimal signed = row.type == FinancialTransactionType.EXPENSE ? safeAmount(row.amount).negate() : safeAmount(row.amount);
            values.merge(blank(classifier.apply(row), "Nao informado"), signed, BigDecimal::add);
        });
        return values.entrySet().stream()
                .sorted((left, right) -> right.getValue().abs().compareTo(left.getValue().abs()))
                .map(entry -> new FinanceDtos.CountItem(entry.getKey(), entry.getValue()))
                .toList();
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private String snapshot(FinancialTransaction transaction) {
        return "{\"type\":\"" + safe(typeLabel(transaction.type))
                + "\",\"category\":\"" + safe(transaction.category)
                + "\",\"description\":\"" + safe(transaction.description)
                + "\",\"amount\":\"" + safe(String.valueOf(transaction.amount))
                + "\",\"paymentMethod\":\"" + safe(transaction.paymentMethod)
                + "\",\"date\":\"" + safe(String.valueOf(transaction.transactionDate))
                + "\",\"responsible\":\"" + safe(transaction.responsibleUser == null ? null : transaction.responsibleUser.email) + "\"}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
