package org.vindesertao.edition;

import jakarta.annotation.security.RolesAllowed;
import jakarta.annotation.security.PermitAll;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;
import org.vindesertao.team.TeamDtos;
import org.vindesertao.team.TeamRepository;

@Path("/editions") @Consumes(MediaType.APPLICATION_JSON) @Produces(MediaType.APPLICATION_JSON)
public class EditionResource {
    @Inject EditionService service;
    @Inject EditionRepository editions;
    @Inject TeamRepository teams;
    @GET @Path("/public-active") @PermitAll public Response publicActive() {
        return editions.active()
            .map(edition -> Response.ok(new EditionDtos.PublicEditionResponse(edition.year, edition.locality)).build())
            .orElseGet(() -> Response.noContent().build());
    }
    @GET @RolesAllowed("admin") public List<EditionDtos.EditionResponse> list() { return service.list().stream().map(EditionDtos.EditionResponse::from).toList(); }
    @GET @Path("/active") @RolesAllowed({"admin", "lider", "projetista"}) public EditionDtos.EditionResponse active() { return EditionDtos.EditionResponse.from(service.active()); }
    @POST @RolesAllowed("admin") public EditionDtos.EditionResponse create(@Valid EditionDtos.EditionRequest request) { return EditionDtos.EditionResponse.from(service.create(request)); }
    @PUT @Path("/{id}/status/{status}") @RolesAllowed("admin") public EditionDtos.EditionResponse status(@PathParam("id") Long id, @PathParam("status") EditionStatus status) { return EditionDtos.EditionResponse.from(service.changeStatus(id, status)); }
    @POST @Path("/{id}/access") @RolesAllowed("admin") public EditionDtos.AccessResponse grant(@PathParam("id") Long id, EditionDtos.AccessRequest request) { return service.grantAccess(id, request); }
    @GET @Path("/{id}/teams") @RolesAllowed("admin") public List<TeamDtos.TeamResponse> teams(@PathParam("id") Long id) { service.find(id); return teams.find("edition.id = ?1 order by name", id).list().stream().map(TeamDtos.TeamResponse::from).toList(); }
}
