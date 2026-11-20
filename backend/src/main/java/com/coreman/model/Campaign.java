package com.coreman.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

/**
 * A timed sale such as "Black Friday": a % discount on the whole shop, some categories or some products,
 * live between startsAt and endsAt. Prices are worked out on the fly, so product prices are never overwritten.
 */
@Entity
@Table(name = "campaigns")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Campaign {

    public enum Scope { ALL, CATEGORIES, PRODUCTS }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String slug;

    /** Percent off the regular price, 1–90. */
    @Column(name = "discount_percent", nullable = false)
    private Integer discountPercent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Scope scope = Scope.ALL;

    /** Categories in the sale (their subcategories are included too). */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "campaign_categories", joinColumns = @JoinColumn(name = "campaign_id"))
    @Column(name = "category_id")
    @Builder.Default
    private Set<Long> categoryIds = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "campaign_products", joinColumns = @JoinColumn(name = "campaign_id"))
    @Column(name = "product_id")
    @Builder.Default
    private Set<Long> productIds = new HashSet<>();

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    /** Switched off campaigns never go live, whatever the dates say. */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    // ---- What shoppers see
    private String headline;

    @Column(columnDefinition = "TEXT")
    private String subheadline;

    /** Text for the strip at the very top of every page. */
    private String announcement;

    @Column(name = "banner_image_url", columnDefinition = "TEXT")
    private String bannerImageUrl;

    /** Banner colour scheme: dark | red | gold | green. */
    @Column(length = 20)
    @Builder.Default
    private String theme = "dark";

    @Column(name = "show_countdown", nullable = false)
    @Builder.Default
    private Boolean showCountdown = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public boolean isLive(Instant now) {
        return Boolean.TRUE.equals(enabled) && !now.isBefore(startsAt) && now.isBefore(endsAt);
    }

    /** LIVE, SCHEDULED, ENDED or OFF. */
    public String status(Instant now) {
        if (!Boolean.TRUE.equals(enabled)) return "OFF";
        if (now.isBefore(startsAt)) return "SCHEDULED";
        return now.isBefore(endsAt) ? "LIVE" : "ENDED";
    }
}
