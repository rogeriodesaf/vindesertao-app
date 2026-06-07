package org.vindesertao.team;

import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/teams")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class TeamResource {
    @Inject
    TeamService teamService;

    @GET
    @RolesAllowed("admin")
    public List<TeamDtos.TeamResponse> list() {
        return teamService.list().stream()
                .map(TeamDtos.TeamResponse::from)
                .toList();
    }

    @GET
    @Path("/mine")
    @RolesAllowed({"admin", "lider", "projetista"})
    public TeamDtos.TeamDetailResponse mine() {
        return teamService.mine();
    }

    @POST
    @RolesAllowed("admin")
    public TeamDtos.TeamResponse create(@Valid TeamDtos.TeamRequest request) {
        return TeamDtos.TeamResponse.from(teamService.create(request));
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("admin")
    public TeamDtos.TeamResponse update(@PathParam("id") Long id, @Valid TeamDtos.TeamRequest request) {
        return TeamDtos.TeamResponse.from(teamService.update(id, request));
    }
}
