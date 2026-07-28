package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import org.vindesertao.user.AppUser;
import org.vindesertao.visit.HouseholdVisit;

import java.time.OffsetDateTime;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

@QuarkusTest
class VisitResourceTest {
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
}
