package org.vindesertao.common;

import java.time.OffsetDateTime;
import java.util.Map;

public record ProblemDetails(
        String type,
        String title,
        int status,
        String detail,
        String path,
        OffsetDateTime timestamp,
        Map<String, String> errors
) {
}
