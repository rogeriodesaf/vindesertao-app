package org.vindesertao.visit;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class DuplicateVisitDtos {
    public record DuplicateGroup(String reason, List<VisitDtos.VisitResponse> visits) {
    }

    public record MergeVisitsRequest(
            @NotNull Long targetId,
            @NotEmpty List<Long> duplicateIds
    ) {
    }
}
