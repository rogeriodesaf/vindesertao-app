package org.vindesertao.social;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class SocialAssistanceRepository implements PanacheRepository<SocialAssistanceRecord> {
}
