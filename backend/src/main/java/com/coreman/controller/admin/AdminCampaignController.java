package com.coreman.controller.admin;

import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Campaign;
import com.coreman.repository.CampaignRepository;
import com.coreman.repository.CategoryRepository;
import com.coreman.repository.OrderRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.service.CampaignService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/admin/campaigns")
@RequiredArgsConstructor
public class AdminCampaignController {

    private final CampaignRepository campaignRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final CampaignService campaignService;

    public record CampaignRequest(String name, String slug, Integer discountPercent, String scope,
                                  List<Long> categoryIds, List<Long> productIds, Instant startsAt, Instant endsAt,
                                  Boolean enabled, String headline, String subheadline, String announcement,
                                  String bannerImageUrl, String theme, Boolean showCountdown) {}

    public record CampaignRow(Long id, String name, String slug, int discountPercent, String scope,
                              Set<Long> categoryIds, Set<Long> productIds, Instant startsAt, Instant endsAt,
                              boolean enabled, String headline, String subheadline, String announcement,
                              String bannerImageUrl, String theme, boolean showCountdown, String status,
                              long productCount, long orders, long units, BigDecimal revenue) {}

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<CampaignRow>> list() {
        Map<Long, Object[]> stats = new HashMap<>();
        for (Object[] r : orderRepository.campaignStats()) stats.put((Long) r[0], r);
        Instant now = Instant.now();
        return ResponseEntity.ok(campaignRepository.findAllByOrderByStartsAtDesc().stream()
                .map(c -> row(c, stats.get(c.getId()), now)).toList());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<CampaignRow> create(@RequestBody CampaignRequest body) {
        Campaign c = new Campaign();
        apply(c, body, true);
        c = campaignRepository.save(c);
        campaignService.invalidate();
        log.info("[ADMIN] Campaign created: {} ({}% off, {} → {})", c.getName(), c.getDiscountPercent(), c.getStartsAt(), c.getEndsAt());
        return ResponseEntity.ok(row(c, null, Instant.now()));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<CampaignRow> update(@PathVariable Long id, @RequestBody CampaignRequest body) {
        Campaign c = find(id);
        apply(c, body, false);
        c = campaignRepository.save(c);
        campaignService.invalidate();
        log.info("[ADMIN] Campaign updated: {}", c.getName());
        return ResponseEntity.ok(row(c, null, Instant.now()));
    }

    /** End a live campaign now (prices go back to normal straight away). */
    @PostMapping("/{id}/end")
    @Transactional
    public ResponseEntity<CampaignRow> endNow(@PathVariable Long id) {
        Campaign c = find(id);
        Instant now = Instant.now();
        if (c.getEndsAt().isAfter(now)) c.setEndsAt(now);
        if (c.getStartsAt().isAfter(now)) c.setStartsAt(now);
        campaignService.invalidate();
        log.info("[ADMIN] Campaign ended early: {}", c.getName());
        return ResponseEntity.ok(row(campaignRepository.save(c), null, now));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Campaign c = find(id);
        campaignRepository.delete(c);
        campaignService.invalidate();
        log.info("[ADMIN] Campaign deleted: {}", c.getName());
        return ResponseEntity.noContent().build();
    }

    private void apply(Campaign c, CampaignRequest b, boolean creating) {
        String name = b.name() == null ? "" : b.name().trim();
        if (name.isEmpty()) throw new BadRequestException("Give the campaign a name.");
        if (b.discountPercent() == null || b.discountPercent() < 1 || b.discountPercent() > 90) {
            throw new BadRequestException("Discount must be between 1% and 90%.");
        }
        if (b.startsAt() == null || b.endsAt() == null) throw new BadRequestException("Set a start and an end time.");
        if (!b.endsAt().isAfter(b.startsAt())) throw new BadRequestException("The end time must be after the start time.");

        Campaign.Scope scope;
        try { scope = Campaign.Scope.valueOf(b.scope() == null ? "ALL" : b.scope().trim().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new BadRequestException("Unknown 'applies to': " + b.scope()); }
        Set<Long> cats = new HashSet<>(b.categoryIds() == null ? List.of() : b.categoryIds());
        Set<Long> prods = new HashSet<>(b.productIds() == null ? List.of() : b.productIds());
        if (scope == Campaign.Scope.CATEGORIES) {
            if (cats.isEmpty()) throw new BadRequestException("Pick at least one category.");
            if (categoryRepository.findAllById(cats).size() != cats.size()) throw new BadRequestException("A chosen category no longer exists.");
        }
        if (scope == Campaign.Scope.PRODUCTS) {
            if (prods.isEmpty()) throw new BadRequestException("Pick at least one product.");
            if (productRepository.findAllById(prods).size() != prods.size()) throw new BadRequestException("A chosen product no longer exists.");
        }

        String slug = slugify(b.slug() != null && !b.slug().isBlank() ? b.slug() : name);
        if (slug.isEmpty()) slug = "sale";
        if (creating || !slug.equals(c.getSlug())) {
            String base = slug;
            for (int i = 2; campaignRepository.existsBySlug(slug); i++) slug = base + "-" + i;
        }

        String theme = b.theme() == null ? "dark" : b.theme().trim().toLowerCase(Locale.ROOT);
        if (!Set.of("dark", "red", "gold", "green").contains(theme)) theme = "dark";

        c.setName(name);
        c.setSlug(slug);
        c.setDiscountPercent(b.discountPercent());
        c.setScope(scope);
        c.getCategoryIds().clear();
        c.getProductIds().clear();
        if (scope == Campaign.Scope.CATEGORIES) c.getCategoryIds().addAll(cats);
        if (scope == Campaign.Scope.PRODUCTS) c.getProductIds().addAll(prods);
        c.setStartsAt(b.startsAt());
        c.setEndsAt(b.endsAt());
        c.setEnabled(b.enabled() == null || b.enabled());
        c.setHeadline(blankToNull(b.headline()));
        c.setSubheadline(blankToNull(b.subheadline()));
        c.setAnnouncement(blankToNull(b.announcement()));
        c.setBannerImageUrl(blankToNull(b.bannerImageUrl()));
        c.setTheme(theme);
        c.setShowCountdown(b.showCountdown() == null || b.showCountdown());
    }

    private CampaignRow row(Campaign c, Object[] s, Instant now) {
        return new CampaignRow(c.getId(), c.getName(), c.getSlug(), c.getDiscountPercent(), c.getScope().name(),
                Set.copyOf(c.getCategoryIds()), Set.copyOf(c.getProductIds()), c.getStartsAt(), c.getEndsAt(),
                Boolean.TRUE.equals(c.getEnabled()), c.getHeadline(), c.getSubheadline(), c.getAnnouncement(),
                c.getBannerImageUrl(), c.getTheme(), Boolean.TRUE.equals(c.getShowCountdown()), c.status(now),
                campaignService.productCount(c),
                s == null ? 0 : ((Number) s[1]).longValue(),
                s == null ? 0 : ((Number) s[2]).longValue(),
                s == null ? BigDecimal.ZERO : (BigDecimal) s[3]);
    }

    private Campaign find(Long id) {
        return campaignRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Campaign not found"));
    }

    private static String slugify(String s) {
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
