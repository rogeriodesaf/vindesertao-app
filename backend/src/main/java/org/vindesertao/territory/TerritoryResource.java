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
@RolesAllowed("admin")
public class TerritoryResource {
    @Inject
    TerritoryService territoryService;

    @GET
    public List<TerritoryDtos.TerritoryResponse> list() {
        return territoryService.list().stream()
                .map(TerritoryDtos.TerritoryResponse::from)
                .toList();
    }

    @POST
    public TerritoryDtos.TerritoryResponse create(@Valid TerritoryDtos.TerritoryRequest request) {
        return TerritoryDtos.TerritoryResponse.from(territoryService.create(request));
    }

    @PUT
    @Path("/{id}")
    public TerritoryDtos.TerritoryResponse update(@PathParam("id") Long id, @Valid TerritoryDtos.TerritoryRequest request) {
        return TerritoryDtos.TerritoryResponse.from(territoryService.update(id, request));
    }
}
