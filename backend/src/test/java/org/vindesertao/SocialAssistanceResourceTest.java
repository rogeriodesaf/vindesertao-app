package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;

@QuarkusTest
class SocialAssistanceResourceTest {
    @Test
    @TestSecurity(user = "lider@vindesertao.local", roles = "lider")
    void explainsHowToRequestSocialTeamAccess() {
        given()
                .contentType(ContentType.JSON)
                .body("""
                        {
                          "assistedPersonName": "Pessoa teste",
                          "city": "Sertao",
                          "serviceType": "OTHER",
                          "quantity": 1
                        }
                        """)
                .when()
                .post("/social-assistance")
                .then()
                .statusCode(400)
                .body("detail", containsString("Solicite ao administrador esse vínculo"));
    }
}
