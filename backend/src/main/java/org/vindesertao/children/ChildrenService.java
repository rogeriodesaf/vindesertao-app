package org.vindesertao.children;

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

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@ApplicationScoped
public class ChildrenService {
    @Inject
    ChildRecordRepository records;

    @Inject
    CurrentUser currentUser;

    @Inject
    AuditService auditService;

    @Transactional
    public ChildRecord create(ChildrenDtos.ChildRequest request) {
        AppUser user = requireAccess();
        ChildRecord record = new ChildRecord();
        apply(request, record);
        record.responsibleUser = user;
        record.createdAt = OffsetDateTime.now();
        record.createdBy = user.email;
        records.persist(record);
        auditService.log("CREATE", "CHILDREN", record.id, null, snapshot(record));
        return record;
    }

    @Transactional
    public ChildRecord update(Long id, ChildrenDtos.ChildRequest request) {
        AppUser user = requireAccess();
        ChildRecord record = getAllowed(id, true, user);
        String before = snapshot(record);
        apply(request, record);
        record.updatedAt = OffsetDateTime.now();
        record.updatedBy = user.email;
        auditService.log("UPDATE", "CHILDREN", record.id, before, snapshot(record));
        return record;
    }

    public ChildRecord getAllowed(Long id, boolean edit, AppUser user) {
        requireAccess(user);
        ChildRecord record = records.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Cadastro infantil nao encontrado."));
        if (currentUser.isAdmin() || record.responsibleUser.id.equals(user.id)) {
            return record;
        }
        throw new ForbiddenException(edit ? "Sem permissao para editar este cadastro." : "Sem permissao para ver este cadastro.");
    }

    public PanacheQuery<ChildRecord> filtered(String activityName, Long responsibleUserId, String neighborhood,
                                             OffsetDateTime from, OffsetDateTime to) {
        AppUser user = requireAccess();
        List<String> where = new ArrayList<>();
        Parameters params = new Parameters();

        if (!currentUser.isAdmin()) {
            where.add("responsibleUser.id = :currentUserId");
            params.and("currentUserId", user.id);
        }
        if (activityName != null && !activityName.isBlank()) {
            where.add("lower(activityName) like :activityName");
            params.and("activityName", "%" + activityName.toLowerCase() + "%");
        }
        if (responsibleUserId != null) {
            where.add("responsibleUser.id = :responsibleUserId");
            params.and("responsibleUserId", responsibleUserId);
        }
        if (neighborhood != null && !neighborhood.isBlank()) {
            where.add("lower(neighborhood) like :neighborhood");
            params.and("neighborhood", "%" + neighborhood.toLowerCase() + "%");
        }
        if (from != null) {
            where.add("createdAt >= :from");
            params.and("from", from);
        }
        if (to != null) {
            where.add("createdAt <= :to");
            params.and("to", to);
        }

        String query = where.isEmpty() ? "order by createdAt desc" : String.join(" and ", where) + " order by createdAt desc";
        Map<String, Object> map = params.map();
        return map.isEmpty() ? records.find(query) : records.find(query, map);
    }

    public ChildrenDtos.ChildrenSummary summary(String activityName, Long responsibleUserId, String neighborhood,
                                                OffsetDateTime from, OffsetDateTime to) {
        List<ChildRecord> rows = filtered(activityName, responsibleUserId, neighborhood, from, to).list();
        return new ChildrenDtos.ChildrenSummary(
                rows.size(),
                rows.size(),
                count(rows, row -> blankLabel(row.activityName)),
                count(rows, row -> row.responsibleUser == null ? "Sem responsavel" : row.responsibleUser.name),
                count(rows, row -> blankLabel(row.neighborhood)),
                count(rows, row -> row.createdAt == null ? "-" : row.createdAt.toLocalDate().toString())
        );
    }

    private AppUser requireAccess() {
        return requireAccess(currentUser.entity());
    }

    private AppUser requireAccess(AppUser user) {
        if (currentUser.isAdmin() || user.canAccessChildren) {
            return user;
        }
        throw new ForbiddenException("Sem permissao para acessar o departamento infantil.");
    }

    private void apply(ChildrenDtos.ChildRequest request, ChildRecord record) {
        record.childName = request.childName();
        record.guardianName = request.guardianName();
        record.guardianPhone = request.guardianPhone();
        record.age = request.age();
        record.neighborhood = request.neighborhood();
        record.city = request.city();
        record.activityName = request.activityName();
        record.notes = request.notes();
    }

    private List<ChildrenDtos.CountItem> count(List<ChildRecord> rows,
                                               java.util.function.Function<ChildRecord, String> classifier) {
        Map<String, Long> values = new LinkedHashMap<>();
        rows.forEach(row -> values.merge(classifier.apply(row), 1L, Long::sum));
        return values.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(entry -> new ChildrenDtos.CountItem(entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    private String blankLabel(String value) {
        return value == null || value.isBlank() ? "Nao informado" : value;
    }

    private String snapshot(ChildRecord record) {
        return "{\"childName\":\"" + safe(record.childName)
                + "\",\"guardianName\":\"" + safe(record.guardianName)
                + "\",\"activityName\":\"" + safe(record.activityName)
                + "\",\"neighborhood\":\"" + safe(record.neighborhood)
                + "\",\"responsible\":\"" + safe(record.responsibleUser == null ? null : record.responsibleUser.email) + "\"}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
