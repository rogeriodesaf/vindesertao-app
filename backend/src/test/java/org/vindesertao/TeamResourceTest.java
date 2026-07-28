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
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class TeamResourceTest {
    @Inject
    AgroalDataSource dataSource;

    @Test
    @TestSecurity(user = "admin@vindesertao.local", roles = "admin")
    void adminCanUpdateAndDeleteAnEmptyTeam() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        long teamId = 999_999L;
        try (var connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                     "insert into teams (id, name, team_type, can_register_visits) values (?, ?, ?, ?)"
             )) {
            statement.setLong(1, teamId);
            statement.setString(2, "Equipe temporaria " + suffix);
            statement.setString(3, "SUPPORT");
            statement.setBoolean(4, false);
            statement.executeUpdate();
        }

        given()
                .contentType(ContentType.JSON)
                .body(request("Equipe atualizada " + suffix))
                .when()
                .put("/teams/" + teamId)
                .then()
                .statusCode(200)
                .body("name", equalTo("Equipe atualizada " + suffix));

        given()
                .when()
                .delete("/teams/" + teamId)
                .then()
                .statusCode(204);

        given()
                .when()
                .delete("/teams/" + teamId)
                .then()
                .statusCode(404);
    }

    private String request(String name) {
        return """
                {
                  "name": "%s",
                  "teamType": "SUPPORT",
                  "canRegisterVisits": false
                }
                """.formatted(name);
    }
}
