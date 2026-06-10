package org.vindesertao.finance;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class FinancialTransactionRepository implements PanacheRepository<FinancialTransaction> {
}
