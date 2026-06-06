package org.vindesertao.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Email @NotBlank String email,
        @NotBlank String password
) {
    public LoginRequest {
        email = email == null ? null : email.trim();
    }
}
