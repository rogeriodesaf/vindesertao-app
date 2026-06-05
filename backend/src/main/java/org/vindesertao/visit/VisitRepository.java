package org.vindesertao.visit;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class VisitRepository implements PanacheRepository<HouseholdVisit> {
}
