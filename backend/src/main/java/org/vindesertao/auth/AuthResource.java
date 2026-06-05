package org.vindesertao.auth;

import jakarta.annotation.security.PermitAll;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject
    AuthService authService;

    @Inject
    CurrentUser currentUser;

    @POST
    @Path("/login")
    @PermitAll
    public Response login(@Valid LoginRequest request) {
        return authService.login(request)
                .map(Response::ok)
                .orElseGet(() -> Response.status(Response.Status.UNAUTHORIZED))
                .build();
    }

    @POST
    @Path("/change-password")
    @RolesAllowed({"admin", "lider", "projetista"})
    @Transactional
    public LoginResponse changePassword(@Valid ChangePasswordRequest request) {
        return authService.changePassword(currentUser.entity(), request);
    }
}
