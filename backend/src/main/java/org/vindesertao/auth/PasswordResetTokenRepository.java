package org.vindesertao.auth;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class PasswordResetTokenRepository implements PanacheRepository<PasswordResetToken> {
    public Optional<PasswordResetToken> findByHash(String tokenHash) {
        return find("tokenHash", tokenHash).firstResultOptional();
    }
}
