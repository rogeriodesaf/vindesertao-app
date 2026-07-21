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

import java.util.Map;

@Path("/auth")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject
    AuthService authService;

    @Inject
    CurrentUser currentUser;

    @Inject
    PasswordResetService passwordResetService;

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

    @POST
    @Path("/forgot-password")
    @PermitAll
    public Map<String, String> forgotPassword(@Valid ForgotPasswordRequest request) {
        passwordResetService.request(request.email());
        return Map.of("message", "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.");
    }

    @POST
    @Path("/reset-password")
    @PermitAll
    public Map<String, String> resetPassword(@Valid ResetPasswordRequest request) {
        passwordResetService.reset(request);
        return Map.of("message", "Senha redefinida com sucesso. Entre novamente com a nova senha.");
    }
}
