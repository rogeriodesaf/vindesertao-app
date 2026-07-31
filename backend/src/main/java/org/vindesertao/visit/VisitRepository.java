package org.vindesertao.visit;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Set;

@ApplicationScoped
public class VisitRepository implements PanacheRepository<HouseholdVisit> {
    public List<Object[]> countsByTeam(Set<Long> teamIds) {
        return getEntityManager().createQuery("""
                select visit.team.id, count(visit),
                       sum(case when visit.latitude is not null and visit.longitude is not null then 1 else 0 end)
                from HouseholdVisit visit
                where visit.team.id in :teamIds
                group by visit.team.id
                """, Object[].class)
                .setParameter("teamIds", teamIds)
                .getResultList();
    }
}
