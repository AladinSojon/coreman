package com.coreman.service;

import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.PasswordResetToken;
import com.coreman.model.User;
import com.coreman.repository.PasswordResetTokenRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Password reset by one-time link: emailed to the customer (when email is set up), or made by an admin
 * to send by hand. Links expire, work once, and stop working when a newer one is made.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    static final Duration EMAIL_LINK_TTL = Duration.ofHours(1);
    static final Duration ADMIN_LINK_TTL = Duration.ofHours(24);
    public static final int MIN_PASSWORD = 8;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SecureRandom random = new SecureRandom();

    @Value("${coreman.frontend-url}")
    private String frontendUrl;

    public boolean emailEnabled() { return mailService.isEnabled(); }

    /** Always succeeds silently, so nobody can use this to find out which emails have accounts. */
    @Transactional
    public void requestByEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) return;
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || Boolean.TRUE.equals(user.getGuest())) return;
        if (!mailService.isEnabled()) {
            log.info("[AUTH] Password reset asked for user id={}, but email isn't set up. Make a link in Admin → Customers.", user.getId());
            return;
        }
        String token = create(user, EMAIL_LINK_TTL, false);
        String link = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + token;
        mailService.send(user.getEmail(), "Reset your CoreMan password", """
                Hi %s,

                We got a request to reset the password for your CoreMan account.
                Open this link to choose a new password (it works once, for the next hour):

                %s

                If you didn't ask for this, you can ignore this email — your password stays the same.

                — CoreMan
                """.formatted(user.getFirstName(), link));
        log.info("[AUTH] Password reset email sent to user id={}", user.getId());
    }

    /** Admin-made link secret (valid 24 h). The admin page turns it into a full link for its own address. */
    @Transactional
    public String createForAdmin(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        if (Boolean.TRUE.equals(user.getGuest())) throw new BadRequestException("Guest customers don't have an account or a password.");
        log.info("[ADMIN] Password reset link made for user id={}", user.getId());
        return create(user, ADMIN_LINK_TTL, true);
    }

    /** Masked email for the reset page ("so***@gmail.com"), or an error if the link is no good. */
    @Transactional(readOnly = true)
    public String check(String token) {
        return mask(valid(token).getUser().getEmail());
    }

    @Transactional
    public void reset(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < MIN_PASSWORD) {
            throw new BadRequestException("Use at least " + MIN_PASSWORD + " characters for your new password.");
        }
        if (newPassword.length() > 72) throw new BadRequestException("That password is too long (72 characters at most).");
        PasswordResetToken t = valid(token);
        User user = t.getUser();
        Instant now = Instant.now();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(now); // signs out every existing session
        userRepository.save(user);
        tokenRepository.expireAllForUser(user.getId(), now);
        log.info("[AUTH] Password reset for user id={}", user.getId());
    }

    /** Tidy up old links once a day. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purge() {
        int n = tokenRepository.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(7)));
        if (n > 0) log.info("[AUTH] Removed {} old password reset links", n);
    }

    private String create(User user, Duration ttl, boolean byAdmin) {
        Instant now = Instant.now();
        tokenRepository.expireAllForUser(user.getId(), now);
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokenRepository.save(PasswordResetToken.builder()
                .user(user).tokenHash(hash(token)).expiresAt(now.plus(ttl)).createdByAdmin(byAdmin).build());
        return token;
    }

    private PasswordResetToken valid(String token) {
        if (token == null || token.isBlank() || token.length() > 100) throw invalid();
        PasswordResetToken t = tokenRepository.findByTokenHash(hash(token.trim())).orElseThrow(PasswordResetService::invalid);
        if (t.getUsedAt() != null || t.getExpiresAt().isBefore(Instant.now())) throw invalid();
        return t;
    }

    private static BadRequestException invalid() {
        return new BadRequestException("This reset link has expired or was already used. Please ask for a new one.");
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return email;
        String name = email.substring(0, at);
        return name.substring(0, Math.min(2, name.length())) + "***" + email.substring(at);
    }
}
