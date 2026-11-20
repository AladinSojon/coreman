package com.coreman.controller;

import com.coreman.config.RateLimiter;
import com.coreman.dto.request.LoginRequest;
import com.coreman.exception.TooManyRequestsException;
import com.coreman.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import com.coreman.dto.request.RegisterRequest;
import com.coreman.dto.response.AuthResponse;
import com.coreman.security.UserPrincipal;
import com.coreman.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final RateLimiter limiter;
    private static final long HOUR = 3_600_000L;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.refreshToken(body.get("refreshToken")));
    }

    /** Emails a reset link if the account exists. Same answer either way, so emails can't be probed. */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> body, HttpServletRequest req) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        limit("forgot-ip:" + RateLimiter.clientIp(req), 5);
        if (limiter.allow("forgot-email:" + email, 3, HOUR)) passwordResetService.requestByEmail(email);
        return ResponseEntity.ok(Map.of("emailEnabled", passwordResetService.emailEnabled()));
    }

    @PostMapping("/reset-password/check")
    public ResponseEntity<Map<String, String>> checkResetLink(@RequestBody Map<String, String> body, HttpServletRequest req) {
        limit("reset-check:" + RateLimiter.clientIp(req), 30);
        return ResponseEntity.ok(Map.of("email", passwordResetService.check(body.get("token"))));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body, HttpServletRequest req) {
        limit("reset:" + RateLimiter.clientIp(req), 20);
        passwordResetService.reset(body.get("token"), body.get("password"));
        return ResponseEntity.ok(Map.of("message", "Password changed. Please sign in with your new password."));
    }

    private void limit(String key, int perHour) {
        if (!limiter.allow(key, perHour, HOUR)) throw new TooManyRequestsException("Too many attempts. Please try again in an hour.");
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(authService.getCurrentUser(principal.getId()));
    }
}
