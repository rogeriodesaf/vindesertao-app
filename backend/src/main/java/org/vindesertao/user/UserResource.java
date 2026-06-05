package org.vindesertao.user;

import io.quarkus.panache.common.Page;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.vindesertao.common.PageResponse;

import java.util.List;

@Path("/users")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
public class UserResource {
    @Inject
    UserRepository users;

    @Inject
    UserService userService;

    @GET
    public PageResponse<UserDtos.UserResponse> list(@QueryParam("page") @DefaultValue("0") int page,
                                                     @QueryParam("size") @DefaultValue("20") int size,
                                                     @QueryParam("includeInactive") @DefaultValue("false") boolean includeInactive) {
        var query = includeInactive
                ? users.find("order by name asc")
                : users.find("active = true order by name asc");
        long total = query.count();
        List<UserDtos.UserResponse> items = query.page(Page.of(page, size)).list()
                .stream()
                .map(userService::toResponse)
                .toList();
        int pages = (int) Math.ceil(total / (double) size);
        return new PageResponse<>(items, total, page, size, pages);
    }

    @POST
    public UserDtos.UserResponse create(@Valid UserDtos.CreateUserRequest request) {
        return userService.toResponse(userService.create(request));
    }

    @PUT
    @Path("/{id}")
    public UserDtos.UserResponse update(@PathParam("id") Long id, @Valid UserDtos.UpdateUserRequest request) {
        return userService.toResponse(userService.update(id, request));
    }

    @GET
    @Path("/summary")
    public UserDtos.UserSummaryResponse summary() {
        return userService.summary();
    }

    @GET
    @Path("/{id}/team-history")
    public List<UserDtos.UserTeamHistoryResponse> teamHistory(@PathParam("id") Long id) {
        return userService.teamHistory(id).stream()
                .map(UserDtos.UserTeamHistoryResponse::from)
                .toList();
    }
}
