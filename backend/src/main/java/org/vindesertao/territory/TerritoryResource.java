package org.vindesertao.territory;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/territories")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class TerritoryResource {
    @Inject
    TerritoryService territoryService;

    @Inject
    TerritoryDistributionService distributionService;

    @GET
    @RolesAllowed({"admin", "lider", "projetista"})
    public List<TerritoryDtos.TerritoryResponse> list() {
        return territoryService.listVisibleResponses();
    }

    @POST
    @RolesAllowed("admin")
    public TerritoryDtos.TerritoryResponse create(@Valid TerritoryDtos.TerritoryRequest request) {
        Long id = territoryService.create(request).id;
        return territoryService.listVisibleResponses().stream()
                .filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("admin")
    public TerritoryDtos.TerritoryResponse update(@PathParam("id") Long id, @Valid TerritoryDtos.TerritoryRequest request) {
        territoryService.update(id, request);
        return territoryService.listVisibleResponses().stream().filter(item -> item.id().equals(id)).findFirst().orElseThrow();
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("admin")
    public void delete(@PathParam("id") Long id) {
        territoryService.delete(id);
    }

    @GET
    @Path("/distribution/draft")
    @RolesAllowed("admin")
    public TerritoryDtos.DistributionPlan draft() {
        return distributionService.currentDraft();
    }

    @POST
    @Path("/distribution/draft")
    @RolesAllowed("admin")
    public TerritoryDtos.DistributionPlan generateDraft(@Valid TerritoryDtos.DistributionRequest request) {
        return distributionService.generateDraft(request);
    }

    @DELETE
    @Path("/distribution/draft")
    @RolesAllowed("admin")
    public void discardDraft() {
        distributionService.discardDraft();
    }

    @POST
    @Path("/distribution/publish")
    @RolesAllowed("admin")
    public List<TerritoryDtos.TerritoryResponse> publish() {
        distributionService.publishDraft();
        return territoryService.listVisibleResponses();
    }
}
