package org.vindesertao.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 160) String name,
        @Email @NotBlank @Size(max = 180) String email,
        @NotBlank @Size(min = 8) String password
) {}
