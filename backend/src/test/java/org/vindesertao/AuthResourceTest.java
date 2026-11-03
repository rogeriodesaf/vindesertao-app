package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.agroal.api.AgroalDataSource;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.util.UUID;
import java.sql.SQLException;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertThrows;

@QuarkusTest
class AuthResourceTest {
    @Inject
    AgroalDataSource dataSource;

    @Test
    void registersViewerWithImmediateLoginAndNoOperationalAccess() throws Exception {
        String email = "cadastro-" + UUID.randomUUID() + "@teste.local";
        String body = """
                {
                  "name": "Usuario visualizador",
                  "email": "%s",
                  "password": "SenhaSegura123"
                }
                """.formatted(email);
        try {
            String token = given()
                    .contentType(ContentType.JSON)
                    .body(body)
                    .when()
                    .post("/auth/register")
                    .then()
                    .statusCode(201)
                    .body("user.roles", hasItem("visualizador"))
                    .body("user.canRegisterVisits", equalTo(false))
                    .body("user.canViewReports", equalTo(false))
                    .extract().path("token");

            given()
                    .contentType(ContentType.JSON)
                    .body("{\"email\":\"" + email + "\",\"password\":\"SenhaSegura123\"}")
                    .when()
                    .post("/auth/login")
                    .then()
                    .statusCode(200)
                    .body("user.roles", hasItem("visualizador"));

            given().auth().oauth2(token).when().get("/visits").then().statusCode(403);
            given().auth().oauth2(token).contentType(ContentType.JSON).body("{}")
                    .when().post("/visits").then().statusCode(403);
            given().auth().oauth2(token).when().get("/users").then().statusCode(403);
            given().auth().oauth2(token).when().get("/territories").then().statusCode(403);

            given().contentType(ContentType.JSON).body(body).when().post("/auth/register")
                    .then().statusCode(409);

            try (var connection = dataSource.getConnection();
                 var statement = connection.prepareStatement("update app_users set can_register_visits = true where email = ?")) {
                statement.setString(1, email);
                assertThrows(SQLException.class, statement::executeUpdate);
            }

            String adminToken = given().contentType(ContentType.JSON)
                    .body("{\"email\":\"admin@vindesertao.local\",\"password\":\"Admin123!\"}")
                    .when().post("/auth/login").then().statusCode(200).extract().path("token");
            int userId = given().auth().oauth2(adminToken).queryParam("q", email).when().get("/users")
                    .then().statusCode(200).body("total", equalTo(1))
                    .body("items[0].active", equalTo(true))
                    .body("items[0].roles", hasItem("visualizador"))
                    .extract().path("items[0].id");

            given().auth().oauth2(adminToken).contentType(ContentType.JSON)
                    .body("""
                            {
                              "name": "Usuario participante",
                              "email": "%s",
                              "roles": ["projetista"],
                              "additionalTeamIds": [],
                              "active": true,
                              "canRegisterVisits": false,
                              "canViewReports": false,
                              "canAccessFinance": false,
                              "canAccessChildren": false
                            }
                            """.formatted(email))
                    .when().put("/users/" + userId).then().statusCode(200)
                    .body("roles", hasItem("projetista"));
        } finally {
            try (var connection = dataSource.getConnection();
                 var statement = connection.prepareStatement("delete from app_users where email = ?")) {
                statement.setString(1, email);
                statement.executeUpdate();
            }
        }
    }
}
