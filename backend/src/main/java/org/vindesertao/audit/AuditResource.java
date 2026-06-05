package org.vindesertao.audit;

import io.quarkus.panache.common.Page;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.vindesertao.common.PageResponse;

import java.util.List;

@Path("/audit")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
public class AuditResource {
    @Inject
    AuditLogRepository logs;

    @GET
    public PageResponse<AuditDtos.AuditLogResponse> list(@QueryParam("page") @DefaultValue("0") int page,
                                                          @QueryParam("size") @DefaultValue("20") int size) {
        var query = logs.find("order by createdAt desc");
        long total = query.count();
        List<AuditDtos.AuditLogResponse> items = query.page(Page.of(page, size)).list()
                .stream()
                .map(AuditDtos.AuditLogResponse::from)
                .toList();
        return new PageResponse<>(items, total, page, size, (int) Math.ceil(total / (double) size));
    }
}
