package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.agroal.api.AgroalDataSource;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.sql.PreparedStatement;
import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;

@QuarkusTest
class UserResourceTest {
    @Inject
    AgroalDataSource dataSource;

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

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void adminCanEditEmailAndDeleteAnUnusedUser() throws Exception {
        long userId = 999_998L;
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        insertUser(userId, "usuario." + suffix + "@teste.local");

        given()
                .contentType(ContentType.JSON)
                .body(updateRequest("USUARIO.EDITADO." + suffix + "@TESTE.LOCAL"))
                .when()
                .put("/users/" + userId)
                .then()
                .statusCode(200)
                .body("email", equalTo("usuario.editado." + suffix + "@teste.local"));

        given()
                .when()
                .delete("/users/" + userId)
                .then()
                .statusCode(204);

        given()
                .when()
                .delete("/users/" + userId)
                .then()
                .statusCode(404);
    }

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void adminCannotDeleteOwnAccount() {
        given()
                .when()
                .delete("/users/1")
                .then()
                .statusCode(409);
    }

    private void insertUser(long id, String email) throws Exception {
        try (var connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "insert into app_users (id, name, email, password_hash, roles, active, created_at) "
                             + "values (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)"
             )) {
            statement.setLong(1, id);
            statement.setString(2, "Usuario temporario");
            statement.setString(3, email);
            statement.setString(4, "hash-temporario");
            statement.setString(5, "projetista");
            statement.setBoolean(6, true);
            statement.executeUpdate();
        }
    }

    private String updateRequest(String email) {
        return """
                {
                  "name": "Usuario editado",
                  "email": "%s",
                  "roles": ["projetista"],
                  "additionalTeamIds": [],
                  "active": true,
                  "canRegisterVisits": true,
                  "canViewReports": false,
                  "canAccessFinance": false,
                  "canAccessChildren": false
                }
                """.formatted(email);
    }
}
