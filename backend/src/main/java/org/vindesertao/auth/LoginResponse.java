package org.vindesertao.auth;

import java.util.Set;

public record LoginResponse(
        String token,
        String tokenType,
        long expiresIn,
        UserPrincipal user
) {
    public record UserPrincipal(
            Long id,
            String name,
            String email,
            Set<String> roles,
            Long teamId,
            boolean mustChangePassword,
            boolean canRegisterVisits,
            boolean canViewReports,
            boolean canAccessFinance
    ) {
    }
}
