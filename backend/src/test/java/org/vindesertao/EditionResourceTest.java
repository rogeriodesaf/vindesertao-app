package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
class EditionResourceTest {
    @Test
    void publicActiveEditionExposesOnlyLocalityAndYear() {
        Map<String, Object> edition = given()
                .when().get("/editions/public-active")
                .then().statusCode(200)
                .extract().as(Map.class);

        assertEquals(Set.of("locality", "year"), edition.keySet());
    }
}
