package org.vindesertao.auth;

import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.mindrot.jbcrypt.BCrypt;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;

@ApplicationScoped
public class AuthService {
    private static final Duration TOKEN_TTL = Duration.ofHours(10);

    @Inject
    UserRepository users;

    @ConfigProperty(name = "mp.jwt.verify.issuer")
    String issuer;

    public Optional<LoginResponse> login(LoginRequest request) {
        return users.findByEmail(request.email())
                .filter(user -> user.active)
                .filter(user -> BCrypt.checkpw(request.password(), user.passwordHash))
                .map(this::toResponse);
    }

    public String hashPassword(String rawPassword) {
        return BCrypt.hashpw(rawPassword, BCrypt.gensalt(12));
    }

    public boolean passwordMatches(String rawPassword, AppUser user) {
        return BCrypt.checkpw(rawPassword, user.passwordHash);
    }

    public LoginResponse changePassword(AppUser user, ChangePasswordRequest request) {
        if (!passwordMatches(request.currentPassword(), user)) {
            throw new IllegalArgumentException("Senha atual incorreta.");
        }
        if (request.newPassword() == null || request.newPassword().length() < 8) {
            throw new IllegalArgumentException("A nova senha deve ter pelo menos 8 caracteres.");
        }
        if (passwordMatches(request.newPassword(), user)) {
            throw new IllegalArgumentException("A nova senha precisa ser diferente da senha atual.");
        }
        user.passwordHash = hashPassword(request.newPassword());
        user.mustChangePassword = false;
        user.updatedAt = OffsetDateTime.now();
        return toResponse(user);
    }

    public LoginResponse toResponse(AppUser user) {
        long expiresIn = TOKEN_TTL.toSeconds();
        String token = Jwt.issuer(issuer)
                .subject(user.email)
                .upn(user.email)
                .groups(user.roleSet())
                .claim("uid", user.id)
                .claim("team_id", user.team == null ? null : user.team.id)
                .claim("must_change_password", user.mustChangePassword)
                .claim("can_register_visits", user.canRegisterVisits)
                .claim("can_view_reports", user.canViewReports)
                .claim("can_access_finance", user.canAccessFinance)
                .expiresIn(TOKEN_TTL)
                .sign();
        return new LoginResponse(token, "Bearer", expiresIn,
                new LoginResponse.UserPrincipal(user.id, user.name, user.email, user.roleSet(), user.team == null ? null : user.team.id,
                        user.mustChangePassword, user.canRegisterVisits, user.canViewReports, user.canAccessFinance));
    }
}
