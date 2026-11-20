package com.coreman.service;

import com.coreman.model.Campaign;
import com.coreman.model.Category;
import com.coreman.model.Product;
import com.coreman.model.ProductVariant;
import com.coreman.repository.CampaignRepository;
import com.coreman.repository.CategoryRepository;
import com.coreman.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

/**
 * Works out sale prices from the campaigns that are live right now.
 *
 * Rule: a campaign takes its % off the product's regular price (the "was" price if the product has one,
 * otherwise its normal price) and rounds to whole Taka. If the product is already cheaper than that,
 * it keeps its own price — discounts never stack. With overlapping campaigns the biggest discount wins.
 */
@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    /** A live campaign with its categories expanded to include every subcategory. */
    public record Live(Campaign campaign, Set<Long> categoryIds, Set<Long> productIds) {
        boolean covers(Product p) {
            return switch (campaign.getScope()) {
                case ALL -> true;
                case CATEGORIES -> p.getCategory() != null && categoryIds.contains(p.getCategory().getId());
                case PRODUCTS -> productIds.contains(p.getId());
            };
        }
    }

    /** price = what the customer pays; was = crossed-out price (null if none); campaign = the sale that set it. */
    public record Price(BigDecimal price, BigDecimal was, Campaign campaign) {}

    private static final long TTL_MS = 30_000;
    private volatile List<Live> cache;
    private volatile long cachedAt;
    /** Live set changes at a start/end time even without edits, so the cache also expires at the next boundary. */
    private volatile Instant cacheValidUntil = Instant.EPOCH;

    @Transactional(readOnly = true)
    public List<Live> live() {
        Instant now = Instant.now();
        List<Live> c = cache;
        if (c != null && System.currentTimeMillis() - cachedAt < TTL_MS && now.isBefore(cacheValidUntil)) return c;

        Map<Long, List<Long>> children = childMap();
        List<Live> result = new ArrayList<>();
        for (Campaign camp : campaignRepository.findLive(now)) {
            result.add(new Live(camp, expand(camp.getCategoryIds(), children), Set.copyOf(camp.getProductIds())));
        }

        // Next moment the live set could change by itself: the nearest end of a live one or start of a scheduled one.
        Instant next = now.plusSeconds(3600);
        for (Campaign camp : campaignRepository.findAll()) {
            if (!Boolean.TRUE.equals(camp.getEnabled())) continue;
            if (camp.getStartsAt().isAfter(now) && camp.getStartsAt().isBefore(next)) next = camp.getStartsAt();
            if (camp.getEndsAt().isAfter(now) && camp.getEndsAt().isBefore(next)) next = camp.getEndsAt();
        }
        cache = List.copyOf(result);
        cachedAt = System.currentTimeMillis();
        cacheValidUntil = next;
        return cache;
    }

    private Map<Long, List<Long>> childMap() {
        Map<Long, List<Long>> children = new HashMap<>();
        for (Category cat : categoryRepository.findAll()) {
            if (cat.getParent() != null) children.computeIfAbsent(cat.getParent().getId(), k -> new ArrayList<>()).add(cat.getId());
        }
        return children;
    }

    private static Set<Long> expand(Collection<Long> roots, Map<Long, List<Long>> children) {
        Set<Long> cats = new HashSet<>();
        Deque<Long> todo = new ArrayDeque<>(roots);
        while (!todo.isEmpty()) {
            Long id = todo.pop();
            if (cats.add(id)) todo.addAll(children.getOrDefault(id, List.of()));
        }
        return cats;
    }

    /** How many products a campaign covers (live or not), for the admin list. */
    @Transactional(readOnly = true)
    public long productCount(Campaign c) {
        return switch (c.getScope()) {
            case ALL -> productRepository.countByIsActiveTrue();
            case CATEGORIES -> c.getCategoryIds().isEmpty() ? 0
                    : productRepository.findIdsByCategoryIds(expand(c.getCategoryIds(), childMap())).size();
            case PRODUCTS -> c.getProductIds().size();
        };
    }

    /** Call after any campaign or category change so prices update straight away. */
    public void invalidate() { cache = null; }

    public Optional<Live> bestFor(Product p) {
        return live().stream().filter(l -> l.covers(p))
                .max(Comparator.comparingInt(l -> l.campaign().getDiscountPercent()));
    }

    /** Price for a product whose normal selling price (before any campaign) is {@code current}. */
    public Price priceFor(Product p, BigDecimal current) {
        BigDecimal regular = p.getCompareAtPrice() != null && p.getCompareAtPrice().compareTo(current) > 0
                ? p.getCompareAtPrice() : current;
        BigDecimal was = regular.compareTo(current) > 0 ? regular : null;
        Optional<Live> best = bestFor(p);
        if (best.isEmpty()) return new Price(current, was, null);

        int pct = best.get().campaign().getDiscountPercent();
        BigDecimal sale = regular.multiply(BigDecimal.valueOf(100 - pct)).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        if (sale.compareTo(current) >= 0) return new Price(current, was, null); // already cheaper on its own
        return new Price(sale, regular, best.get().campaign());
    }

    public Price priceFor(ProductVariant v) {
        return priceFor(v.getProduct(), v.getEffectivePrice());
    }

    public BigDecimal unitPrice(ProductVariant v) {
        return priceFor(v).price();
    }

    /**
     * Products in the sale for listings. Empty = nothing live; {@code all} = the whole shop.
     */
    public record SaleSet(boolean all, Set<Long> productIds) {
        public boolean isEmpty() { return !all && productIds.isEmpty(); }
    }

    @Transactional(readOnly = true)
    public SaleSet saleSet() {
        Set<Long> ids = new HashSet<>();
        for (Live l : live()) {
            SaleSet s = productsOf(l);
            if (s.all()) return s;
            ids.addAll(s.productIds());
        }
        return new SaleSet(false, ids);
    }

    /** Products a live campaign covers, or empty if it isn't live. */
    @Transactional(readOnly = true)
    public SaleSet productsOf(Campaign c) {
        return live().stream().filter(l -> l.campaign().getId().equals(c.getId())).findFirst()
                .map(this::productsOf).orElse(new SaleSet(false, Set.of()));
    }

    private SaleSet productsOf(Live l) {
        return switch (l.campaign().getScope()) {
            case ALL -> new SaleSet(true, Set.of());
            case CATEGORIES -> new SaleSet(false, l.categoryIds().isEmpty() ? Set.of()
                    : new HashSet<>(productRepository.findIdsByCategoryIds(l.categoryIds())));
            case PRODUCTS -> new SaleSet(false, l.productIds());
        };
    }
}
