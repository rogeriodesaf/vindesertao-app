package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

@QuarkusTest
class UserResourceTest {
    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void searchesUsersByNameOrEmail() {
        given()
                .queryParam("q", "lider@vindesertao")
                .queryParam("page", 0)
                .queryParam("size", 20)
                .when()
                .get("/users")
                .then()
                .statusCode(200)
                .body("total", greaterThanOrEqualTo(1))
                .body("items.email", everyItem(containsStringIgnoringCase("lider@vindesertao")));
    }
}
