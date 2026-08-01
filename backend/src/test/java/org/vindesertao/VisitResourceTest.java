package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.vindesertao.audit.AuditLog;
import org.vindesertao.team.Team;
import org.vindesertao.user.AppUser;
import org.vindesertao.visit.HouseholdVisit;

import java.time.OffsetDateTime;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class VisitResourceTest {
    private static final long OTHER_TEAM_ID = 9002L;
    private static final long PROJECTIST_ID = 9003L;
    private static final String PROJECTIST_EMAIL = "projetista.edicao@vindesertao.local";

    @Inject
    EntityManager entityManager;

    @Test
    @TestSecurity(user = "lider@vindesertao.local", roles = "lider")
    void offlineRetryWithSameClientReferenceDoesNotDuplicateVisit() {
        String reference = UUID.randomUUID().toString();
        String body = """
                {
                  "personName": "Visita offline idempotente",
                  "city": "Rio Tinto",
                  "wantsVisits": true,
                  "clientReference": "%s"
                }
                """.formatted(reference);
        Long firstId = given().contentType(ContentType.JSON).body(body)
                .when().post("/visits").then().statusCode(200).extract().jsonPath().getLong("id");
        try {
            given().contentType(ContentType.JSON).body(body)
                    .when().post("/visits").then().statusCode(200).body("id", equalTo(firstId.intValue()));
            assertEquals(1L, HouseholdVisit.count("clientReference", reference));
        } finally {
            QuarkusTransaction.requiringNew().run(() -> HouseholdVisit.delete("clientReference", reference));
        }
    }

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void adminListsVisitsButDoesNotCreateVisitSheets() {
        String body = """
                {
                  "personName": "Maria",
                  "phone": "88999990000",
                  "street": "Rua Principal",
                  "number": "10",
                  "neighborhood": "Centro",
                  "city": "Sertao",
                  "latitude": -7.0,
                  "longitude": -39.0,
                  "wantsVisits": true,
                  "notes": "Recebe a tarde"
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(body)
                .when()
                .post("/visits")
                .then()
                .statusCode(400);

        given()
                .when()
                .get("/visits?page=0&size=10")
                .then()
                .statusCode(200)
                .body("total", greaterThanOrEqualTo(0));
    }

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void adminUpdatesAndDeletesVisitSheets() {
        Long visitId = QuarkusTransaction.requiringNew().call(() -> {
            AppUser leader = AppUser.<AppUser>find("email", "lider@vindesertao.local").firstResult();
            HouseholdVisit visit = new HouseholdVisit();
            visit.personName = "Pessoa para editar";
            visit.city = "Sertao";
            visit.wantsVisits = true;
            visit.responsibleUser = leader;
            visit.team = leader.team;
            visit.createdAt = OffsetDateTime.now();
            visit.createdBy = leader.email;
            visit.persist();
            return visit.id;
        });

        String updatedBody = """
                {
                  "personName": "Pessoa atualizada pelo admin",
                  "city": "Sertao",
                  "wantsVisits": false,
                  "notes": "Cadastro revisado"
                }
                """;

        given()
                .contentType(ContentType.JSON)
                .body(updatedBody)
                .when()
                .put("/visits/" + visitId)
                .then()
                .statusCode(200)
                .body("personName", equalTo("Pessoa atualizada pelo admin"));

        given()
                .when()
                .delete("/visits/" + visitId)
                .then()
                .statusCode(204);

        given()
                .when()
                .get("/visits/" + visitId)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = PROJECTIST_EMAIL, roles = "projetista")
    void projectistUpdatesOnlyOwnVisit() {
        Long[] ids = QuarkusTransaction.requiringNew().call(() -> {
            Team team = Team.findById(1L);
            AppUser leader = AppUser.<AppUser>find("email", "lider@vindesertao.local").firstResult();
            entityManager.createNativeQuery("""
                    insert into app_users(id, name, email, password_hash, roles, team_id, active, created_at,
                                          must_change_password, can_register_visits, can_view_reports,
                                          can_access_finance, can_access_children)
                    values (:id, :name, :email, :password, 'projetista', :teamId, true, current_timestamp,
                            false, true, false, false, false)
                    """)
                    .setParameter("id", PROJECTIST_ID)
                    .setParameter("name", "Projetista de edição")
                    .setParameter("email", PROJECTIST_EMAIL)
                    .setParameter("password", "teste")
                    .setParameter("teamId", team.id)
                    .executeUpdate();
            AppUser projectist = AppUser.findById(PROJECTIST_ID);

            HouseholdVisit ownVisit = testVisit("Visita própria", projectist, team);
            HouseholdVisit otherVisit = testVisit("Visita de outra pessoa", leader, team);
            return new Long[]{projectist.id, ownVisit.id, otherVisit.id};
        });

        String updatedBody = """
                {
                  "personName": "Visita própria atualizada",
                  "city": "Rio Tinto",
                  "wantsVisits": true
                }
                """;

        try {
            given().contentType(ContentType.JSON).body(updatedBody)
                    .when().put("/visits/" + ids[1])
                    .then().statusCode(200)
                    .body("personName", equalTo("Visita própria atualizada"));

            given().contentType(ContentType.JSON).body(updatedBody)
                    .when().put("/visits/" + ids[2])
                    .then().statusCode(403);
        } finally {
            QuarkusTransaction.requiringNew().run(() -> {
                AuditLog.delete("actor.id", ids[0]);
                HouseholdVisit.deleteById(ids[1]);
                HouseholdVisit.deleteById(ids[2]);
                AppUser.deleteById(ids[0]);
            });
        }
    }

    @Test
    @TestSecurity(user = "lider@vindesertao.local", roles = "lider")
    void userStillListsOwnVisitWhenItBelongsToAnotherTeam() {
        Long[] ids = QuarkusTransaction.requiringNew().call(() -> {
            AppUser leader = AppUser.<AppUser>find("email", "lider@vindesertao.local").firstResult();
            entityManager.createNativeQuery("""
                    insert into teams(id, name, team_type, can_register_visits)
                    values (:id, :name, 'EVANGELISM', true)
                    """)
                    .setParameter("id", OTHER_TEAM_ID)
                    .setParameter("name", "Equipe temporária da própria visita")
                    .executeUpdate();
            Team otherTeam = Team.findById(OTHER_TEAM_ID);

            HouseholdVisit visit = new HouseholdVisit();
            visit.personName = "Visita própria em outra equipe";
            visit.city = "Sertao";
            visit.wantsVisits = true;
            visit.responsibleUser = leader;
            visit.team = otherTeam;
            visit.createdAt = OffsetDateTime.now();
            visit.createdBy = leader.email;
            visit.persist();
            return new Long[]{visit.id, otherTeam.id};
        });

        try {
            given()
                    .when()
                    .get("/visits?page=0&size=100")
                    .then()
                    .statusCode(200)
                    .body("items.id", hasItem(ids[0].intValue()));
        } finally {
            QuarkusTransaction.requiringNew().run(() -> {
                HouseholdVisit.deleteById(ids[0]);
                Team.deleteById(ids[1]);
            });
        }
    }

    private HouseholdVisit testVisit(String personName, AppUser responsible, Team team) {
        HouseholdVisit visit = new HouseholdVisit();
        visit.personName = personName;
        visit.city = "Rio Tinto";
        visit.wantsVisits = true;
        visit.responsibleUser = responsible;
        visit.team = team;
        visit.createdAt = OffsetDateTime.now();
        visit.createdBy = responsible.email;
        visit.persist();
        return visit;
    }
}
