package com.coreman.repository;

import com.coreman.model.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    @Query("SELECT c FROM Campaign c WHERE c.enabled = true AND c.startsAt <= :now AND c.endsAt > :now ORDER BY c.discountPercent DESC, c.id")
    List<Campaign> findLive(Instant now);

    Optional<Campaign> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Campaign> findAllByOrderByStartsAtDesc();
}
