package org.vindesertao;

import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class SocialAssistanceResourceTest {
    private static final long SOCIAL_TEAM_ID = 9001L;

    @Inject
    AgroalDataSource dataSource;

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

    @Test
    @TestSecurity(user = "lider@vindesertao.local", roles = "lider")
    void listsLinkedSocialTeamAndAllowsDeletingOwnRecord() throws SQLException {
        clearFixture();
        try {
            execute(
                    "insert into teams(id, name, team_type, can_register_visits) values (?, ?, 'SOCIAL_ACTION', false)",
                    SOCIAL_TEAM_ID, "Equipe Social Teste"
            );
            execute(
                    "insert into user_team_memberships(user_id, team_id) values (2, ?)",
                    SOCIAL_TEAM_ID
            );

            given()
                    .when()
                    .get("/social-assistance/teams")
                    .then()
                    .statusCode(200)
                    .body("size()", equalTo(1))
                    .body("[0].id", equalTo((int) SOCIAL_TEAM_ID))
                    .body("[0].name", equalTo("Equipe Social Teste"))
                    .body("[0].teamType", equalTo("SOCIAL_ACTION"));

            int recordId = given()
                    .contentType(ContentType.JSON)
                    .body("""
                            {
                              "assistedPersonName": "Pessoa com equipe",
                              "city": "Sertao",
                              "serviceType": "OTHER",
                              "quantity": 1,
                              "teamId": 9001
                            }
                            """)
                    .when()
                    .post("/social-assistance")
                    .then()
                    .statusCode(200)
                    .body("teamId", equalTo((int) SOCIAL_TEAM_ID))
                    .extract()
                    .path("id");

            given()
                    .when()
                    .delete("/social-assistance/{id}", recordId)
                    .then()
                    .statusCode(204);
        } finally {
            clearFixture();
        }
    }

    private void clearFixture() throws SQLException {
        execute("delete from social_assistance_records where team_id = ?", SOCIAL_TEAM_ID);
        execute("delete from user_team_memberships where team_id = ?", SOCIAL_TEAM_ID);
        execute("delete from teams where id = ?", SOCIAL_TEAM_ID);
    }

    private void execute(String sql, Object... values) throws SQLException {
        try (var connection = dataSource.getConnection();
             var statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < values.length; index++) {
                statement.setObject(index + 1, values[index]);
            }
            statement.executeUpdate();
        }
    }
}
