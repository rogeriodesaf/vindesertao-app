package org.vindesertao.edition;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class EditionRepository implements PanacheRepository<Edition> {
    public Optional<Edition> active() { return find("status = ?1", EditionStatus.ACTIVE).firstResultOptional(); }
}
