package org.vindesertao.visit;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;

import java.time.OffsetDateTime;
import java.util.*;

@ApplicationScoped
public class DuplicateVisitService {
    @Inject
    VisitRepository visits;

    @Inject
    AuditService auditService;

    public List<DuplicateVisitDtos.DuplicateGroup> findDuplicates() {
        List<HouseholdVisit> rows = visits.find("order by createdAt desc").list();
        Map<String, List<HouseholdVisit>> groups = new LinkedHashMap<>();
        rows.forEach(visit -> {
            if (visit.phone != null && !visit.phone.isBlank()) {
                groups.computeIfAbsent("Telefone: " + digits(visit.phone), ignored -> new ArrayList<>()).add(visit);
            }
            String addressKey = normalized(visit.personName) + "|" + normalized(visit.street) + "|" + normalized(visit.number);
            if (!addressKey.replace("|", "").isBlank()) {
                groups.computeIfAbsent("Nome e endereco: " + addressKey, ignored -> new ArrayList<>()).add(visit);
            }
        });
        return groups.entrySet().stream()
                .filter(entry -> entry.getValue().size() > 1)
                .map(entry -> new DuplicateVisitDtos.DuplicateGroup(
                        entry.getKey(),
                        entry.getValue().stream().map(VisitDtos.VisitResponse::from).toList()
                ))
                .toList();
    }

    @Transactional
    public VisitDtos.VisitResponse merge(DuplicateVisitDtos.MergeVisitsRequest request) {
        HouseholdVisit target = visits.findByIdOptional(request.targetId())
                .orElseThrow(() -> new NotFoundException("Ficha principal nao encontrada."));
        List<HouseholdVisit> duplicates = request.duplicateIds().stream()
                .filter(id -> !id.equals(request.targetId()))
                .map(id -> visits.findByIdOptional(id).orElseThrow(() -> new NotFoundException("Ficha duplicada nao encontrada: " + id)))
                .toList();
        if (duplicates.isEmpty()) {
            throw new IllegalArgumentException("Selecione pelo menos uma ficha duplicada diferente da principal.");
        }
        String before = "target=" + target.id + ", duplicates=" + request.duplicateIds();
        StringBuilder notes = new StringBuilder(target.notes == null ? "" : target.notes);
        duplicates.forEach(duplicate -> {
            if (!notes.isEmpty()) {
                notes.append("\n\n");
            }
            notes.append("Mesclado da ficha #").append(duplicate.id).append(" em ").append(OffsetDateTime.now()).append(".");
            if (duplicate.notes != null && !duplicate.notes.isBlank()) {
                notes.append("\nObservacoes anteriores: ").append(duplicate.notes);
            }
            visits.delete(duplicate);
        });
        target.notes = notes.toString();
        target.updatedAt = OffsetDateTime.now();
        target.updatedBy = "merge";
        auditService.log("MERGE", "VISIT", target.id, before, "duplicatesRemoved=" + request.duplicateIds());
        return VisitDtos.VisitResponse.from(target);
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String digits(String value) {
        return value == null ? "" : value.replaceAll("\\D+", "");
    }
}
