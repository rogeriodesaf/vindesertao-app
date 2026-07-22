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

    @GET
    @RolesAllowed({"admin", "lider", "projetista"})
    public List<TerritoryDtos.TerritoryResponse> list() {
        return territoryService.listVisible().stream()
                .map(TerritoryDtos.TerritoryResponse::from)
                .toList();
    }

    @POST
    @RolesAllowed("admin")
    public TerritoryDtos.TerritoryResponse create(@Valid TerritoryDtos.TerritoryRequest request) {
        return TerritoryDtos.TerritoryResponse.from(territoryService.create(request));
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("admin")
    public TerritoryDtos.TerritoryResponse update(@PathParam("id") Long id, @Valid TerritoryDtos.TerritoryRequest request) {
        return TerritoryDtos.TerritoryResponse.from(territoryService.update(id, request));
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("admin")
    public void delete(@PathParam("id") Long id) {
        territoryService.delete(id);
    }
}
