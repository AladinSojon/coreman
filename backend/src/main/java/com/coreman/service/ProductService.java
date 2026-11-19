package com.coreman.service;

import com.coreman.dto.request.ProductFilter;
import com.coreman.dto.response.ProductFacets;
import com.coreman.dto.response.ProductResponse;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.repository.ProductSpecifications;
import com.coreman.model.Category;
import com.coreman.model.Product;
import com.coreman.model.ProductImage;
import com.coreman.model.ProductVariant;
import com.coreman.repository.CategoryRepository;
import com.coreman.repository.OrderRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReviewRepository reviewRepository;
    private final OrderRepository orderRepository;

    public Page<ProductResponse> getProducts(Pageable pageable) {
        return productRepository.findByIsActiveTrue(pageable).map(this::mapToResponse);
    }

    private static final List<String> SIZE_ORDER = List.of("XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL");

    public Page<ProductResponse> filterProducts(ProductFilter filter, int page, int size) {
        List<String> categorySlugs = null;
        if (filter.category() != null && !filter.category().isBlank()) {
            Category category = categoryRepository.findBySlug(filter.category())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + filter.category()));
            categorySlugs = new java.util.ArrayList<>();
            collectSlugs(category, categorySlugs);
        }
        if (filter.gender() != null && !filter.gender().isBlank()) {
            try {
                com.coreman.model.enums.Gender.valueOf(filter.gender().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown gender: " + filter.gender());
            }
        }

        boolean best = Boolean.TRUE.equals(filter.bestSellers());
        String sortKey = filter.sort() == null || filter.sort().isBlank() ? (best ? "popular" : "newest") : filter.sort();
        int pageSize = Math.min(Math.max(size, 1), 48);
        int pageIndex = Math.max(page, 0);
        LocalDateTime newCutoff = LocalDateTime.now().minusDays(newDays);

        List<Long> ranking = (best || "popular".equals(sortKey)) ? bestSellerRanking() : null;
        if (best && ranking.isEmpty()) return Page.empty(PageRequest.of(pageIndex, pageSize));

        var spec = ProductSpecifications.matching(filter, categorySlugs, newCutoff, best ? ranking : null);

        if ("popular".equals(sortKey)) {
            // Sales rank isn't a column, so rank in memory (the catalogue is small; best sellers are capped).
            Map<Long, Integer> rank = new HashMap<>();
            for (int i = 0; i < ranking.size(); i++) rank.put(ranking.get(i), i);
            List<Product> all = new ArrayList<>(productRepository.findAll(spec, Sort.by("createdAt").descending()));
            all.sort(Comparator.comparingInt(p -> rank.getOrDefault(p.getId(), Integer.MAX_VALUE)));
            int from = Math.min(pageIndex * pageSize, all.size());
            List<ProductResponse> content = all.subList(from, Math.min(from + pageSize, all.size())).stream()
                    .map(this::mapToResponse).toList();
            return new PageImpl<>(content, PageRequest.of(pageIndex, pageSize), all.size());
        }

        Sort sort = switch (sortKey) {
            case "price_asc" -> Sort.by("basePrice").ascending().and(Sort.by("id"));
            case "price_desc" -> Sort.by("basePrice").descending().and(Sort.by("id"));
            case "name" -> Sort.by("name").ascending();
            case "newest" -> Sort.by("createdAt").descending().and(Sort.by("id").descending());
            default -> throw new BadRequestException("Unknown sort: " + filter.sort());
        };
        return productRepository.findAll(spec, PageRequest.of(pageIndex, pageSize, sort)).map(this::mapToResponse);
    }

    // ---------------------------------------------------------------- collections

    @Value("${coreman.collections.new-days:30}")
    private int newDays;

    @Value("${coreman.collections.best-seller-days:90}")
    private int bestSellerDays;

    @Value("${coreman.collections.best-seller-min:8}")
    private int bestSellerMin;

    private static final int BEST_SELLER_MAX = 24;
    private static final long RANKING_TTL_MS = 5 * 60 * 1000L;
    private volatile List<Long> cachedRanking = List.of();
    private volatile long cachedAt = 0;

    /**
     * Product ids in best-seller order: most units sold in the last N days (cancelled orders excluded),
     * topped up with Featured products while there are fewer than the minimum. Cached for 5 minutes.
     */
    public List<Long> bestSellerRanking() {
        if (System.currentTimeMillis() - cachedAt < RANKING_TTL_MS) return cachedRanking;
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        for (Object[] row : orderRepository.bestSellingProducts(LocalDateTime.now().minusDays(bestSellerDays), PageRequest.of(0, BEST_SELLER_MAX))) {
            ids.add(((Number) row[0]).longValue());
        }
        if (ids.size() < bestSellerMin) {
            for (Long id : productRepository.findFeaturedIds()) {
                if (ids.size() >= bestSellerMin) break;
                ids.add(id);
            }
        }
        cachedRanking = List.copyOf(ids);
        cachedAt = System.currentTimeMillis();
        return cachedRanking;
    }

    public boolean isNew(Product p) {
        LocalDateTime now = LocalDateTime.now();
        if (p.getNewUntil() != null) return now.isBefore(p.getNewUntil());
        return p.getCreatedAt() != null && p.getCreatedAt().isAfter(now.minusDays(newDays));
    }

    public ProductFacets getFacets() {
        List<String> sizes = productRepository.findActiveSizes().stream()
                .sorted(Comparator.comparingInt((String s) -> {
                    int i = SIZE_ORDER.indexOf(s.toUpperCase());
                    return i < 0 ? Integer.MAX_VALUE : i;
                }).thenComparing(Comparator.naturalOrder()))
                .toList();

        // One entry per colour name (first hex wins if the same name has several shades).
        Map<String, ProductFacets.ColorOption> colors = new LinkedHashMap<>();
        for (Object[] row : productRepository.findActiveColors()) {
            String name = (String) row[0];
            colors.putIfAbsent(name.toLowerCase(), new ProductFacets.ColorOption(name, (String) row[1]));
        }

        List<Object[]> range = productRepository.findActivePriceRange();
        Object[] r = range.isEmpty() ? new Object[]{null, null} : range.get(0);
        return new ProductFacets(sizes, List.copyOf(colors.values()), (BigDecimal) r[0], (BigDecimal) r[1]);
    }

    public ProductResponse getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + slug));
        return mapToResponse(product);
    }

    public List<ProductResponse> getFeaturedProducts() {
        return productRepository.findFeaturedProducts().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Page<ProductResponse> getProductsByCategory(String categorySlug, Pageable pageable) {
        // Collect this category + all descendant slugs
        Category category = categoryRepository.findBySlug(categorySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categorySlug));
        List<String> slugs = new java.util.ArrayList<>();
        collectSlugs(category, slugs);
        return productRepository.findByCategorySlugs(slugs, pageable).map(this::mapToResponse);
    }

    private void collectSlugs(Category category, List<String> slugs) {
        slugs.add(category.getSlug());
        if (category.getChildren() != null) {
            for (Category child : category.getChildren()) {
                collectSlugs(child, slugs);
            }
        }
    }

    public Page<ProductResponse> searchProducts(String query, Pageable pageable) {
        return productRepository.search(query, pageable).map(this::mapToResponse);
    }

    private ProductResponse mapToResponse(Product product) {
        Double avgRating = reviewRepository.getAverageRatingByProductId(product.getId());
        long reviewCount = reviewRepository.countByProductId(product.getId());

        List<ProductResponse.VariantResponse> variants = product.getVariants().stream()
                .map(this::mapVariant)
                .toList();

        List<ProductResponse.ImageResponse> images = product.getImages().stream()
                .map(this::mapImage)
                .toList();

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                product.getBasePrice(),
                product.getCompareAtPrice(),
                product.getBrand(),
                product.getGender() != null ? product.getGender().name() : null,
                product.getIsFeatured(),
                isNew(product),
                bestSellerRanking().contains(product.getId()),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getCategory() != null ? product.getCategory().getSlug() : null,
                avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null,
                reviewCount,
                product.getCreatedAt(),
                variants,
                images
        );
    }

    private ProductResponse.VariantResponse mapVariant(ProductVariant v) {
        return new ProductResponse.VariantResponse(
                v.getId(), v.getSize(), v.getColor(), v.getColorHex(),
                v.getSku(), v.getEffectivePrice(), v.getStockQuantity(), v.getImageUrl()
        );
    }

    private ProductResponse.ImageResponse mapImage(ProductImage img) {
        return new ProductResponse.ImageResponse(
                img.getId(), img.getImageUrl(), img.getDisplayOrder(), img.getIsPrimary()
        );
    }
}
