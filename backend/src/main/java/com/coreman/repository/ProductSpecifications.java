package com.coreman.repository;

import com.coreman.dto.request.ProductFilter;
import com.coreman.model.Product;
import com.coreman.model.ProductVariant;
import com.coreman.model.enums.Gender;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/** Builds the WHERE clause for the public product listing. */
public final class ProductSpecifications {

    private ProductSpecifications() {}

    /**
     * @param categorySlugs the requested category plus all its descendants, or null for no category filter
     */
    public static Specification<Product> matching(ProductFilter f, Collection<String> categorySlugs) {
        return matching(f, categorySlugs, null, null);
    }

    /**
     * @param newCutoff products created after this are "new" unless newUntil says otherwise (used when f.newArrivals())
     * @param onlyIds   restrict to these product ids (best sellers); null = no restriction
     */
    public static Specification<Product> matching(ProductFilter f, Collection<String> categorySlugs,
                                                  java.time.LocalDateTime newCutoff, Collection<Long> onlyIds) {
        return matching(f, categorySlugs, newCutoff, onlyIds, false, null);
    }

    /**
     * @param saleAll  a live campaign covers the whole shop, so "on sale" means every product
     * @param saleIds  products covered by live campaigns (on sale besides those with a "was" price)
     */
    public static Specification<Product> matching(ProductFilter f, Collection<String> categorySlugs,
                                                  java.time.LocalDateTime newCutoff, Collection<Long> onlyIds,
                                                  boolean saleAll, Collection<Long> saleIds) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(cb.isTrue(root.get("isActive")));
            if (onlyIds != null) p.add(root.get("id").in(onlyIds));
            if (Boolean.TRUE.equals(f.newArrivals()) && newCutoff != null) {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                p.add(cb.or(
                        cb.and(cb.isNotNull(root.get("newUntil")), cb.greaterThan(root.get("newUntil"), now)),
                        cb.and(cb.isNull(root.get("newUntil")), cb.greaterThanOrEqualTo(root.get("createdAt"), newCutoff))));
            }

            if (has(f.q())) {
                String like = "%" + f.q().trim().toLowerCase() + "%";
                p.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("brand")), like)));
            }
            if (categorySlugs != null) {
                p.add(root.join("category").get("slug").in(categorySlugs));
            }
            if (has(f.gender())) {
                Gender g = Gender.valueOf(f.gender().trim().toUpperCase());
                // Unisex items belong in both the men's and women's collections.
                p.add(g == Gender.UNISEX
                        ? cb.equal(root.get("gender"), g)
                        : root.get("gender").in(g, Gender.UNISEX));
            }
            if (f.minPrice() != null) p.add(cb.greaterThanOrEqualTo(root.get("basePrice"), f.minPrice()));
            if (f.maxPrice() != null) p.add(cb.lessThanOrEqualTo(root.get("basePrice"), f.maxPrice()));
            if (Boolean.TRUE.equals(f.featured())) p.add(cb.isTrue(root.get("isFeatured")));
            if (Boolean.TRUE.equals(f.sale()) && !saleAll) {
                Predicate marked = cb.and(cb.isNotNull(root.get("compareAtPrice")),
                        cb.greaterThan(root.get("compareAtPrice"), root.<java.math.BigDecimal>get("basePrice")));
                p.add(saleIds == null || saleIds.isEmpty() ? marked : cb.or(marked, root.get("id").in(saleIds)));
            }

            // Size / colour: product must have an in-stock variant matching both (if given).
            if (has(f.size()) || has(f.color())) {
                Subquery<Long> sq = query.subquery(Long.class);
                Root<ProductVariant> v = sq.from(ProductVariant.class);
                List<Predicate> vp = new ArrayList<>();
                vp.add(cb.equal(v.get("product"), root));
                vp.add(cb.greaterThan(v.get("stockQuantity"), 0));
                if (has(f.size())) vp.add(cb.equal(cb.lower(v.get("size")), f.size().trim().toLowerCase()));
                if (has(f.color())) vp.add(cb.equal(cb.lower(v.get("color")), f.color().trim().toLowerCase()));
                sq.select(v.get("id")).where(vp.toArray(Predicate[]::new));
                p.add(cb.exists(sq));
            }

            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    private static boolean has(String s) {
        return s != null && !s.isBlank();
    }
}
