package org.vindesertao;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import org.vindesertao.user.UserRepository;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

@QuarkusTest
class AuthResourceTest {
    @Inject
    UserRepository users;

    @Test
    void registersPendingUserAndDoesNotAllowLoginBeforeApproval() {
        String email = "cadastro-" + UUID.randomUUID() + "@teste.local";
        String body = """
                {
                  "name": "Usuario aguardando aprovacao",
                  "email": "%s",
                  "password": "SenhaSegura123"
                }
                """.formatted(email);
        try {
            given()
                    .contentType(ContentType.JSON)
                    .body(body)
                    .when()
                    .post("/auth/register")
                    .then()
                    .statusCode(201)
                    .body("message", equalTo("Cadastro recebido. Aguarde a aprovacao do administrador."));

            given()
                    .contentType(ContentType.JSON)
                    .body("{\"email\":\"" + email + "\",\"password\":\"SenhaSegura123\"}")
                    .when()
                    .post("/auth/login")
                    .then()
                    .statusCode(401);
        } finally {
            users.delete("email", email);
        }
    }
}
