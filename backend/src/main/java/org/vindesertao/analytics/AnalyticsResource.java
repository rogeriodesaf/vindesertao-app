package org.vindesertao.analytics;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.time.OffsetDateTime;

@Path("/analytics")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({"admin", "lider"})
public class AnalyticsResource {
    @Inject
    AnalyticsService analyticsService;

    @GET
    @Path("/dashboard")
    public AnalyticsDtos.DashboardResponse dashboard(@QueryParam("from") String from,
                                                     @QueryParam("to") String to) {
        return analyticsService.dashboard(parse(from), parse(to));
    }

    private OffsetDateTime parse(String value) {
        return value == null || value.isBlank() ? null : OffsetDateTime.parse(value);
    }
}
