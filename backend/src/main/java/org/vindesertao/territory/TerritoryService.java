package org.vindesertao.territory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.NotFoundException;
import org.vindesertao.audit.AuditService;
import org.vindesertao.auth.CurrentUser;
import org.vindesertao.team.Team;
import org.vindesertao.team.TeamRepository;
import org.vindesertao.user.AppUser;
import org.vindesertao.user.UserTeamMembershipRepository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@ApplicationScoped
public class TerritoryService {
    @Inject
    TerritoryRepository territories;

    @Inject
    TeamRepository teams;

    @Inject
    ObjectMapper objectMapper;

    @Inject
    AuditService auditService;

    @Inject
    CurrentUser currentUser;

    @Inject
    UserTeamMembershipRepository memberships;

    public List<Territory> listVisible() {
        if (currentUser.isAdmin()) {
            return list();
        }
        Set<Long> teamIds = visibleVisitTeamIds(currentUser.entity());
        if (teamIds.isEmpty()) {
            return List.of();
        }
        return territories.find("active = true and team.id in ?1 order by name", teamIds).list();
    }

    private List<Territory> list() {
        return territories.find("order by name").list();
    }

    public List<Territory> enforcedForTeam(Long teamId) {
        return territories.find("team.id = ?1 and active = true and enforceForProjectists = true", teamId).list();
    }

    @Transactional
    public Territory create(TerritoryDtos.TerritoryRequest request) {
        Territory territory = new Territory();
        apply(request, territory);
        territory.createdAt = OffsetDateTime.now();
        territories.persist(territory);
        auditService.log("CREATE", "TERRITORY", territory.id, null, snapshot(territory));
        return territory;
    }

    @Transactional
    public Territory update(Long id, TerritoryDtos.TerritoryRequest request) {
        Territory territory = territories.findByIdOptional(id)
                .orElseThrow(() -> new NotFoundException("Territorio nao encontrado."));
        String before = snapshot(territory);
        apply(request, territory);
        territory.updatedAt = OffsetDateTime.now();
        auditService.log("UPDATE", "TERRITORY", territory.id, before, snapshot(territory));
        return territory;
    }

    public boolean contains(Territory territory, double latitude, double longitude) {
        List<double[]> points = points(territory.polygonGeoJson);
        if (points.size() < 3) {
            return false;
        }
        boolean inside = false;
        for (int i = 0, j = points.size() - 1; i < points.size(); j = i++) {
            double xi = points.get(i)[1];
            double yi = points.get(i)[0];
            double xj = points.get(j)[1];
            double yj = points.get(j)[0];
            boolean intersects = ((yi > latitude) != (yj > latitude))
                    && (longitude < (xj - xi) * (latitude - yi) / (yj - yi + 0.0) + xi);
            if (intersects) {
                inside = !inside;
            }
        }
        return inside;
    }

    private void apply(TerritoryDtos.TerritoryRequest request, Territory territory) {
        territory.name = request.name();
        territory.team = teams.findByIdOptional(request.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Equipe invalida."));
        territory.color = request.color();
        territory.polygonGeoJson = request.polygonGeoJson();
        if (points(territory.polygonGeoJson).size() < 3) {
            throw new IllegalArgumentException("O territorio precisa ter pelo menos 3 pontos no mapa.");
        }
        territory.active = request.active();
        territory.enforceForProjectists = request.enforceForProjectists();
    }

    private List<double[]> points(String geoJson) {
        try {
            JsonNode coordinates = objectMapper.readTree(geoJson).path("coordinates").path(0);
            List<double[]> points = new ArrayList<>();
            coordinates.forEach(node -> points.add(new double[]{node.get(1).asDouble(), node.get(0).asDouble()}));
            return points;
        } catch (RuntimeException | java.io.IOException exception) {
            throw new IllegalArgumentException("Poligono invalido.");
        }
    }

    private Set<Long> visibleVisitTeamIds(AppUser user) {
        Set<Long> ids = new LinkedHashSet<>();
        if (user.team != null && user.team.canRegisterVisits) {
            ids.add(user.team.id);
        }
        memberships.find("user.id = ?1 and team.canRegisterVisits = true order by team.name", user.id)
                .list()
                .forEach(membership -> ids.add(membership.team.id));
        return ids;
    }

    private String snapshot(Territory territory) {
        return "{\"name\":\"" + safe(territory.name) + "\",\"team\":\"" + safe(territory.team == null ? null : territory.team.name)
                + "\",\"active\":" + territory.active + ",\"enforceForProjectists\":" + territory.enforceForProjectists + "}";
    }

    private String safe(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
