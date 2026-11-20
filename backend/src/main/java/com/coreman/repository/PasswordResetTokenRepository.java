package com.coreman.repository;

import com.coreman.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Old links stop working once a new one is made or the password is changed. */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.user.id = :userId AND t.usedAt IS NULL")
    int expireAllForUser(Long userId, Instant now);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredBefore(Instant cutoff);
}
