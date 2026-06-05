package org.vindesertao.auth;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.NotFoundException;
import org.eclipse.microprofile.jwt.JsonWebToken;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

@ApplicationScoped
public class CurrentUser {
    @Inject
    SecurityIdentity identity;

    @Inject
    JsonWebToken jwt;

    @Inject
    UserRepository users;

    public AppUser entity() {
        String email = null;
        try {
            email = jwt.getSubject();
        } catch (RuntimeException ignored) {
            // Quarkus test-security and some non-JWT security identities do not expose JWT claims.
        }
        if (email == null || email.isBlank()) {
            email = identity.getPrincipal().getName();
        }
        return users.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Usuario autenticado nao encontrado."));
    }

    public boolean isAdmin() {
        return identity.hasRole("admin");
    }

    public boolean isLeader() {
        return identity.hasRole("lider");
    }
}
