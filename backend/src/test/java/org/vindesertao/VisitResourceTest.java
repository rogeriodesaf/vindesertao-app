package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
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
}
