package com.coreman.service;

import com.coreman.dto.request.LoginRequest;
import com.coreman.dto.request.RegisterRequest;
import com.coreman.dto.response.AuthResponse;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.User;
import com.coreman.model.enums.Role;
import com.coreman.repository.UserRepository;
import com.coreman.security.JwtTokenProvider;
import com.coreman.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already registered");
        }

        User user = User.builder()
                .email(request.email().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .phone(request.phone())
                .role(Role.CUSTOMER)
                .build();

        user = userRepository.save(user);
        log.info("[AUTH] New user registered: id={}, email={}", user.getId(), user.getEmail());

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().toLowerCase().trim())
                .orElseThrow(() -> new BadRequestException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid email or password");
        }

        log.info("[AUTH] User logged in: id={}, email={}", user.getId(), user.getEmail());
        return buildAuthResponse(user);
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        String tokenType = tokenProvider.getTokenType(refreshToken);
        if (!"refresh".equals(tokenType)) {
            throw new BadRequestException("Invalid token type");
        }

        Long userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return buildAuthResponse(user);
    }

    public AuthResponse.UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapUserResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        String accessToken = tokenProvider.generateAccessToken(principal);
        String refreshToken = tokenProvider.generateRefreshToken(principal);

        return new AuthResponse(accessToken, refreshToken, mapUserResponse(user));
    }

    private AuthResponse.UserResponse mapUserResponse(User user) {
        return new AuthResponse.UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole().name(),
                user.getAvatarUrl()
        );
    }
}
