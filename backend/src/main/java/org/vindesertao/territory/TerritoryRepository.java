package org.vindesertao.territory;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class TerritoryRepository implements PanacheRepository<Territory> {
}
