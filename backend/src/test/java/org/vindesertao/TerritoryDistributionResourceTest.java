package org.vindesertao;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.vindesertao.team.Team;
import org.vindesertao.territory.TerritoryDistributionDraft;
import org.vindesertao.territory.TerritoryDtos;
import org.vindesertao.territory.Territory;
import org.vindesertao.user.AppUser;
import org.vindesertao.visit.HouseholdVisit;

import java.time.OffsetDateTime;
import java.util.*;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class TerritoryDistributionResourceTest {
    @Inject EntityManager entityManager;
    @Inject ObjectMapper objectMapper;

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void distributesThirtyHousesAcrossFifteenTeamsWithoutDuplicatesAndKeepsStreetsTogether() {
        Fixture fixture = QuarkusTransaction.requiringNew().call(this::fixture);
        try {
            TerritoryDtos.DistributionPlan plan = given()
                    .contentType(ContentType.JSON)
                    .body(Map.of("teamIds", fixture.teamIds))
                    .when().post("/territories/distribution/draft")
                    .then().statusCode(200)
                    .extract().as(TerritoryDtos.DistributionPlan.class);

            assertEquals(15, plan.areas().size());
            assertEquals(30, plan.totalHouses());
            assertEquals(30, plan.locatedHouses());
            assertEquals(0, plan.unlocatedHouses());
            assertTrue(plan.maximumHouses() - plan.minimumHouses() <= 2);

            Set<Long> uniqueVisits = new HashSet<>();
            Map<String, Set<Long>> streetTeams = new HashMap<>();
            plan.areas().forEach(area -> {
                assertEquals("COMPLETA", area.coverageStatus());
                assertTrue(area.polygonGeoJson().contains("\"Polygon\""));
                area.houses().forEach(house -> {
                    assertTrue(uniqueVisits.add(house.visitId()), "A casa deve aparecer em uma unica equipe");
                    streetTeams.computeIfAbsent(house.street(), ignored -> new HashSet<>()).add(area.teamId());
                });
            });
            assertEquals(30, uniqueVisits.size());
            assertTrue(streetTeams.values().stream().allMatch(teamIds -> teamIds.size() == 1),
                    "Ruas inteiras devem permanecer juntas quando a divisao ja esta equilibrada");
            List<Cell> cells = plan.areas().stream().map(area -> cell(area.polygonGeoJson())).toList();
            for (int left = 0; left < cells.size(); left++) {
                for (int right = left + 1; right < cells.size(); right++) {
                    assertFalse(cells.get(left).overlaps(cells.get(right)), "Territorios nao podem se sobrepor");
                }
            }

            given().contentType(ContentType.JSON).body("{}")
                    .when().post("/territories/distribution/publish")
                    .then().statusCode(200);

            QuarkusTransaction.requiringNew().run(() -> {
                assertEquals(15L, Territory.count("generated = true and team.id in ?1", fixture.teamIds));
                assertEquals(30L, HouseholdVisit.count("id in ?1 and team.id in ?2", fixture.visitIds, fixture.teamIds));
                assertEquals(0L, TerritoryDistributionDraft.count("createdBy.id", fixture.adminId));
            });
        } finally {
            QuarkusTransaction.requiringNew().run(() -> cleanup(fixture));
        }
    }

    @Test
    @TestSecurity(user = "lider@vindesertao.local", roles = "lider")
    void onlyAdminCanGenerateDistributionDraft() {
        given().contentType(ContentType.JSON).body(Map.of("teamIds", List.of(1)))
                .when().post("/territories/distribution/draft")
                .then().statusCode(403);
    }

    private Fixture fixture() {
        AppUser admin = AppUser.<AppUser>find("email", "admin@vindesertao.local").firstResult();
        List<Long> teamIds = new ArrayList<>();
        List<Long> visitIds = new ArrayList<>();
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        for (int index = 0; index < 15; index++) {
            long teamId = 910_000L + index;
            entityManager.createNativeQuery("insert into teams(id, name, team_type, can_register_visits) values (?1, ?2, 'EVANGELISM', true)")
                    .setParameter(1, teamId)
                    .setParameter(2, "Equipe distribuicao " + suffix + " " + index)
                    .executeUpdate();
            Team team = Team.findById(teamId);
            teamIds.add(team.id);

            for (int house = 0; house < 2; house++) {
                HouseholdVisit visit = new HouseholdVisit();
                visit.personName = "Casa " + index + "-" + house;
                visit.street = "Rua teste " + index;
                visit.number = String.valueOf(house + 1);
                visit.neighborhood = "Bairro teste";
                visit.city = "Rio Tinto";
                visit.latitude = -6.90 + index * 0.005 + house * 0.0001;
                visit.longitude = -35.13 + (index % 5) * 0.01 + house * 0.0001;
                visit.wantsVisits = true;
                visit.responsibleUser = admin;
                visit.team = team;
                visit.createdBy = admin.email;
                visit.createdAt = OffsetDateTime.now();
                visit.persist();
                visitIds.add(visit.id);
            }
        }
        return new Fixture(admin.id, teamIds, visitIds);
    }

    private void cleanup(Fixture fixture) {
        TerritoryDistributionDraft.delete("createdBy.id", fixture.adminId);
        Territory.delete("generated = true and team.id in ?1", fixture.teamIds);
        HouseholdVisit.delete("id in ?1", fixture.visitIds);
        Team.delete("id in ?1", fixture.teamIds);
    }

    private Cell cell(String geoJson) {
        try {
            var coordinates = objectMapper.readTree(geoJson).path("coordinates").path(0);
            double west = Double.POSITIVE_INFINITY, east = Double.NEGATIVE_INFINITY;
            double south = Double.POSITIVE_INFINITY, north = Double.NEGATIVE_INFINITY;
            for (var coordinate : coordinates) {
                west = Math.min(west, coordinate.get(0).asDouble());
                east = Math.max(east, coordinate.get(0).asDouble());
                south = Math.min(south, coordinate.get(1).asDouble());
                north = Math.max(north, coordinate.get(1).asDouble());
            }
            return new Cell(south, west, north, east);
        } catch (Exception exception) {
            throw new AssertionError("GeoJSON invalido", exception);
        }
    }

    private record Fixture(Long adminId, List<Long> teamIds, List<Long> visitIds) {}
    private record Cell(double south, double west, double north, double east) {
        boolean overlaps(Cell other) {
            double width = Math.min(east, other.east) - Math.max(west, other.west);
            double height = Math.min(north, other.north) - Math.max(south, other.south);
            return width > 1e-12 && height > 1e-12;
        }
    }
}
