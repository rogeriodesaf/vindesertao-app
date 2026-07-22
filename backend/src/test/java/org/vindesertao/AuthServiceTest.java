package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.vindesertao.auth.AuthService;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class AuthServiceTest {
    @Inject
    AuthService authService;

    @Inject
    UserRepository users;

    @Test
    void loginWithSeedAdminReturnsToken() {
        var response = authService.login(new org.vindesertao.auth.LoginRequest("admin@vindesertao.local", "Admin123!"));

        assertTrue(response.isPresent());
        assertNotNull(response.get().token());
        assertTrue(response.get().user().roles().contains("admin"));
    }

    @Test
    void seededAdminExists() {
        assertTrue(users.findByEmail("admin@vindesertao.local").isPresent());
    }

    @Test
    void adminWithoutTeamCanReceiveToken() {
        var user = new AppUser();
        user.id = 999L;
        user.name = "Administrador sem equipe";
        user.email = "admin.sem.equipe@vindesertao.local";
        user.roles = "admin";

        var response = authService.toResponse(user);

        assertNotNull(response.token());
        assertNull(response.user().teamId());
    }
}
