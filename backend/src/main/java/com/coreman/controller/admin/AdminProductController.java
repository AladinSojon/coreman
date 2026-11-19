package com.coreman.controller.admin;

import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.*;
import com.coreman.model.enums.Gender;
import com.coreman.repository.*;
import com.coreman.service.AdminAnalyticsService;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository variantRepository;
    private final CartItemRepository cartItemRepository;
    private final WishlistRepository wishlistRepository;
    private final ReviewRepository reviewRepository;

    /**
     * ?q=name/slug/sku&categoryId=3&status=active|inactive|featured|sale|lowstock|outofstock&page=0&size=20
     */
    @GetMapping
    public ResponseEntity<Page<Product>> getAll(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                Subquery<Long> skuMatch = query.subquery(Long.class);
                Root<ProductVariant> v = skuMatch.from(ProductVariant.class);
                skuMatch.select(v.get("id")).where(cb.equal(v.get("product"), root), cb.like(cb.lower(v.get("sku")), like));
                p.add(cb.or(cb.like(cb.lower(root.get("name")), like), cb.like(cb.lower(root.get("slug")), like), cb.exists(skuMatch)));
            }
            if (categoryId != null) p.add(cb.equal(root.get("category").get("id"), categoryId));
            if (status != null) switch (status) {
                case "active" -> p.add(cb.isTrue(root.get("isActive")));
                case "inactive" -> p.add(cb.isFalse(root.get("isActive")));
                case "featured" -> p.add(cb.isTrue(root.get("isFeatured")));
                case "sale" -> p.add(cb.greaterThan(root.get("compareAtPrice"), root.<BigDecimal>get("basePrice")));
                case "lowstock", "outofstock" -> {
                    Subquery<Long> sq = query.subquery(Long.class);
                    Root<ProductVariant> v = sq.from(ProductVariant.class);
                    sq.select(v.get("id")).where(cb.equal(v.get("product"), root),
                            "outofstock".equals(status) ? cb.equal(v.get("stockQuantity"), 0)
                                    : cb.lessThanOrEqualTo(v.get("stockQuantity"), AdminAnalyticsService.LOW_STOCK_THRESHOLD));
                    p.add(cb.exists(sq));
                }
                default -> { }
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        return ResponseEntity.ok(productRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    /** Quick stock edit from the products table. */
    @PutMapping("/variants/{variantId}/stock")
    public ResponseEntity<ProductVariant> updateStock(@PathVariable Long variantId, @RequestBody Map<String, Object> body) {
        ProductVariant v = variantRepository.findById(variantId)
                .orElseThrow(() -> new ResourceNotFoundException("Variant not found"));
        int stock = ((Number) body.get("stockQuantity")).intValue();
        if (stock < 0) throw new BadRequestException("Stock can't be negative");
        v.setStockQuantity(stock);
        log.info("[ADMIN] Stock set: variant={} stock={}", variantId, stock);
        return ResponseEntity.ok(variantRepository.save(v));
    }

    /** Copy a product (inactive, new slug) as a starting point for a similar item. */
    @PostMapping("/{id}/duplicate")
    @Transactional
    public ResponseEntity<Product> duplicate(@PathVariable Long id) {
        Product src = productRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        String slug = src.getSlug() + "-copy";
        for (int n = 2; productRepository.existsBySlug(slug); n++) slug = src.getSlug() + "-copy-" + n;

        Product copy = Product.builder()
                .name(src.getName() + " (copy)").slug(slug).description(src.getDescription())
                .basePrice(src.getBasePrice()).compareAtPrice(src.getCompareAtPrice())
                .category(src.getCategory()).brand(src.getBrand()).gender(src.getGender())
                .isActive(false).isFeatured(false).build();
        for (ProductImage img : src.getImages()) {
            copy.getImages().add(ProductImage.builder().product(copy).imageUrl(img.getImageUrl())
                    .displayOrder(img.getDisplayOrder()).isPrimary(img.getIsPrimary()).build());
        }
        for (ProductVariant v : src.getVariants()) {
            copy.getVariants().add(ProductVariant.builder().product(copy).size(v.getSize()).color(v.getColor())
                    .colorHex(v.getColorHex()).sku(null).priceOverride(v.getPriceOverride()).stockQuantity(0).build());
        }
        Product saved = productRepository.save(copy);
        log.info("[ADMIN] Product duplicated: {} -> {}", id, saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found")));
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<Product> create(@RequestBody Map<String, Object> body) {
        Product product = new Product();
        product.setName((String) body.get("name"));
        product.setSlug((String) body.get("slug"));
        product.setDescription((String) body.get("description"));
        product.setBasePrice(new BigDecimal(body.get("basePrice").toString()));
        product.setCompareAtPrice(parsePrice(body.get("compareAtPrice")));
        product.setBrand((String) body.get("brand"));
        product.setGender(Gender.valueOf(((String) body.get("gender")).toUpperCase()));
        product.setIsActive(body.get("isActive") != null ? (Boolean) body.get("isActive") : true);
        product.setIsFeatured(body.get("isFeatured") != null ? (Boolean) body.get("isFeatured") : false);

        if (body.get("categoryId") != null) {
            Long categoryId = ((Number) body.get("categoryId")).longValue();
            product.setCategory(categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }

        // Images
        if (body.get("images") != null) {
            List<Map<String, Object>> images = (List<Map<String, Object>>) body.get("images");
            for (int i = 0; i < images.size(); i++) {
                Map<String, Object> img = images.get(i);
                product.getImages().add(ProductImage.builder()
                        .product(product)
                        .imageUrl((String) img.get("imageUrl"))
                        .displayOrder(i)
                        .isPrimary(i == 0)
                        .build());
            }
        }

        // Variants
        if (body.get("variants") != null) {
            List<Map<String, Object>> variants = (List<Map<String, Object>>) body.get("variants");
            for (Map<String, Object> v : variants) {
                product.getVariants().add(ProductVariant.builder()
                        .product(product)
                        .size((String) v.get("size"))
                        .color((String) v.get("color"))
                        .colorHex((String) v.get("colorHex"))
                        .sku((String) v.get("sku"))
                        .stockQuantity(v.get("stockQuantity") != null ? ((Number) v.get("stockQuantity")).intValue() : 0)
                        .build());
            }
        }

        Product saved = productRepository.save(product);
        log.info("[ADMIN] Product created: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Product> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (body.containsKey("name")) product.setName((String) body.get("name"));
        if (body.containsKey("slug")) product.setSlug((String) body.get("slug"));
        if (body.containsKey("description")) product.setDescription((String) body.get("description"));
        if (body.containsKey("basePrice")) product.setBasePrice(new BigDecimal(body.get("basePrice").toString()));
        if (body.containsKey("compareAtPrice")) product.setCompareAtPrice(parsePrice(body.get("compareAtPrice")));
        if (body.containsKey("brand")) product.setBrand((String) body.get("brand"));
        if (body.containsKey("gender")) product.setGender(Gender.valueOf(((String) body.get("gender")).toUpperCase()));
        if (body.containsKey("isActive")) product.setIsActive((Boolean) body.get("isActive"));
        if (body.containsKey("isFeatured")) product.setIsFeatured((Boolean) body.get("isFeatured"));
        if (body.containsKey("categoryId")) {
            Long categoryId = ((Number) body.get("categoryId")).longValue();
            product.setCategory(categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }

        // Replace images
        if (body.containsKey("images")) {
            product.getImages().clear();
            List<Map<String, Object>> images = (List<Map<String, Object>>) body.get("images");
            for (int i = 0; i < images.size(); i++) {
                Map<String, Object> img = images.get(i);
                product.getImages().add(ProductImage.builder()
                        .product(product)
                        .imageUrl((String) img.get("imageUrl"))
                        .displayOrder(i)
                        .isPrimary(i == 0)
                        .build());
            }
        }

        // Replace variants
        if (body.containsKey("variants")) {
            product.getVariants().clear();
            List<Map<String, Object>> variants = (List<Map<String, Object>>) body.get("variants");
            for (Map<String, Object> v : variants) {
                product.getVariants().add(ProductVariant.builder()
                        .product(product)
                        .size((String) v.get("size"))
                        .color((String) v.get("color"))
                        .colorHex((String) v.get("colorHex"))
                        .sku((String) v.get("sku"))
                        .stockQuantity(v.get("stockQuantity") != null ? ((Number) v.get("stockQuantity")).intValue() : 0)
                        .build());
            }
        }

        Product saved = productRepository.save(product);
        log.info("[ADMIN] Product updated: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.ok(saved);
    }

    /**
     * Products that appear in past orders can't be deleted (order history needs them) — deactivate instead.
     * Otherwise remove them from carts and wishlists first, then delete.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        if (variantRepository.productHasOrders(id)) {
            throw new BadRequestException("This product appears in past orders, so it can't be deleted. Set it to Inactive to hide it from the shop.");
        }
        cartItemRepository.deleteByVariantProductId(id);
        wishlistRepository.deleteByProductId(id);
        reviewRepository.deleteByProductId(id);
        productRepository.delete(product);
        log.info("[ADMIN] Product deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }

    /** Blank / null / zero means "not on sale". */
    private static BigDecimal parsePrice(Object raw) {
        if (raw == null || raw.toString().isBlank()) return null;
        BigDecimal value = new BigDecimal(raw.toString());
        return value.signum() > 0 ? value : null;
    }
}
