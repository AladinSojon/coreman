package com.coreman.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        UserResponse user
) {
    public record UserResponse(
            Long id,
            String email,
            String firstName,
            String lastName,
            String role,
            String avatarUrl
    ) {}
}
