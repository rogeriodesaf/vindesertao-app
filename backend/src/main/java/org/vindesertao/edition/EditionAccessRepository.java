package org.vindesertao.edition;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class EditionAccessRepository implements PanacheRepository<EditionAccess> {}
