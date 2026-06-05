package org.vindesertao.user;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class UserRepository implements PanacheRepository<AppUser> {
    public Optional<AppUser> findByEmail(String email) {
        return find("lower(email)", email.toLowerCase()).firstResultOptional();
    }
}
