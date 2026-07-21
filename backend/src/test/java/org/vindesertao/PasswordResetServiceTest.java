package org.vindesertao;

import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.vindesertao.auth.PasswordResetService;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@QuarkusTest
class PasswordResetServiceTest {
    @Inject
    PasswordResetService passwordResetService;

    @Inject
    MockMailbox mailbox;

    @BeforeEach
    void clearMailbox() {
        mailbox.clear();
    }

    @Test
    void sendsSingleUseResetLinkForActiveUser() {
        passwordResetService.request("admin@vindesertao.local");

        var messages = mailbox.getMailsSentTo("admin@vindesertao.local");
        assertEquals(1, messages.size());
        assertTrue(messages.getFirst().getHtml().contains("/reset-password?token="));
        assertTrue(messages.getFirst().getSubject().contains("Redefinição de senha"));
    }

    @Test
    void doesNotRevealOrSendForUnknownUser() {
        passwordResetService.request("nao-cadastrado@vindesertao.local");

        assertEquals(0, mailbox.getTotalMessagesSent());
    }
}
