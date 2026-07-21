package org.vindesertao.auth;

import io.quarkus.mailer.Mail;
import io.quarkus.mailer.Mailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@ApplicationScoped
public class PasswordResetService {
    private static final Logger LOG = Logger.getLogger(PasswordResetService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Map<String, OffsetDateTime> LAST_REQUESTS = new ConcurrentHashMap<>();

    @Inject
    UserRepository users;

    @Inject
    PasswordResetTokenRepository tokens;

    @Inject
    AuthService authService;

    @Inject
    Mailer mailer;

    @ConfigProperty(name = "app.frontend.url")
    String frontendUrl;

    @ConfigProperty(name = "app.reset-password.expiration-minutes")
    int expirationMinutes;

    @Transactional
    public void request(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();
        OffsetDateTime now = OffsetDateTime.now();
        LAST_REQUESTS.entrySet().removeIf(entry -> entry.getValue().isBefore(now.minusHours(1)));
        OffsetDateTime previous = LAST_REQUESTS.put(email, now);
        if (previous != null && previous.isAfter(now.minusMinutes(1))) {
            return;
        }

        AppUser user = users.findByEmail(email).filter(candidate -> candidate.active).orElse(null);
        if (user == null) {
            return;
        }

        tokens.update("status = ?1 where user = ?2 and status = ?3", "INVALIDATED", user, "ACTIVE");
        String rawToken = generateToken();
        PasswordResetToken token = new PasswordResetToken();
        token.user = user;
        token.tokenHash = hashToken(rawToken);
        token.createdAt = now;
        token.expiresAt = now.plusMinutes(expirationMinutes);
        tokens.persist(token);

        String link = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + rawToken;
        String html = """
                <h2>Redefinição de senha - Vinde Sertão</h2>
                <p>Olá, <strong>%s</strong>.</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
                <p><a href="%s">Redefinir minha senha</a></p>
                <p>Este link expira em %d minutos e pode ser utilizado apenas uma vez.</p>
                <p>Se você não fez esta solicitação, ignore este e-mail.</p>
                """.formatted(escapeHtml(user.name), link, expirationMinutes);
        try {
            mailer.send(Mail.withHtml(user.email, "Redefinição de senha - Vinde Sertão", html));
        } catch (RuntimeException exception) {
            token.status = "INVALIDATED";
            LOG.error("Não foi possível enviar o e-mail de redefinição de senha.", exception);
        }
    }

    @Transactional
    public void reset(ResetPasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("A confirmação da senha não confere.");
        }

        PasswordResetToken token = tokens.findByHash(hashToken(request.token()))
                .orElseThrow(() -> new IllegalArgumentException("Link de redefinição inválido ou expirado."));
        OffsetDateTime now = OffsetDateTime.now();
        if (!"ACTIVE".equals(token.status) || token.expiresAt.isBefore(now) || !token.user.active) {
            throw new IllegalArgumentException("Link de redefinição inválido ou expirado.");
        }
        if (authService.passwordMatches(request.newPassword(), token.user)) {
            throw new IllegalArgumentException("A nova senha precisa ser diferente da senha atual.");
        }

        token.user.passwordHash = authService.hashPassword(request.newPassword());
        token.user.mustChangePassword = false;
        token.user.updatedAt = now;
        token.status = "USED";
        token.usedAt = now;
        tokens.update("status = ?1 where user = ?2 and status = ?3 and id <> ?4", "INVALIDATED", token.user, "ACTIVE", token.id);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((value == null ? "" : value).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("Não foi possível proteger o token de redefinição.", exception);
        }
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
