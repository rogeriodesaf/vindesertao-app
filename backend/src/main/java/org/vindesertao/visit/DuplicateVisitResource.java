package org.vindesertao.visit;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/visits/duplicates")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
public class DuplicateVisitResource {
    @Inject
    DuplicateVisitService duplicateVisitService;

    @GET
    public List<DuplicateVisitDtos.DuplicateGroup> list() {
        return duplicateVisitService.findDuplicates();
    }

    @POST
    @Path("/merge")
    public VisitDtos.VisitResponse merge(@Valid DuplicateVisitDtos.MergeVisitsRequest request) {
        return duplicateVisitService.merge(request);
    }
}
