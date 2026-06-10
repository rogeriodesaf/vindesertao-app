package org.vindesertao.inscricao;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class InscricaoRepository implements PanacheRepository<Inscricao> {
}
