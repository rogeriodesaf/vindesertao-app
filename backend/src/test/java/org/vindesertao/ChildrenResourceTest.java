package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class ChildrenResourceTest {
    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void createsFilteredSummaryNormalizesPhoneAndDeletesRecords() {
        long boyId = create("Menino Teste", "MALE", 8, "(83) 99999-1111", "Responsavel A", "Comunidade Teste");
        long girlId = create("Menina Teste", "FEMALE", 10, "83999992222", "Responsavel B", "Comunidade Teste");

        given()
                .queryParam("activityName", "EBF")
                .queryParam("neighborhood", "Comunidade Teste")
                .when()
                .get("/children/summary")
                .then()
                .statusCode(200)
                .body("totalChildren", equalTo(2))
                .body("boys", equalTo(1))
                .body("girls", equalTo(1))
                .body("averageAge", equalTo(9.0f))
                .body("distinctGuardians", equalTo(2))
                .body("distinctNeighborhoods", equalTo(1));

        given()
                .when()
                .get("/children/" + boyId)
                .then()
                .statusCode(200)
                .body("guardianPhone", equalTo("83999991111"));

        given().when().delete("/children/" + boyId).then().statusCode(204);
        given().when().delete("/children/" + girlId).then().statusCode(204);
    }

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void rejectsAgeAboveMinistryLimit() {
        given()
                .contentType(ContentType.JSON)
                .body(request("Idade Invalida", "MALE", 18, "83999990000", "Responsavel", "Centro"))
                .when()
                .post("/children")
                .then()
                .statusCode(400);
    }

    private long create(String name, String gender, int age, String phone, String guardian, String neighborhood) {
        return given()
                .contentType(ContentType.JSON)
                .body(request(name, gender, age, phone, guardian, neighborhood))
                .when()
                .post("/children")
                .then()
                .statusCode(200)
                .extract()
                .jsonPath()
                .getLong("id");
    }

    private String request(String name, String gender, int age, String phone, String guardian, String neighborhood) {
        return """
                {
                  "childName": "%s",
                  "guardianName": "%s",
                  "guardianPhone": "%s",
                  "age": %d,
                  "gender": "%s",
                  "neighborhood": "%s",
                  "city": "Sertao",
                  "activityName": "EBF"
                }
                """.formatted(name, guardian, phone, age, gender, neighborhood);
    }
}
