package org.vindesertao.children;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ChildRecordRepository implements PanacheRepository<ChildRecord> {
}
