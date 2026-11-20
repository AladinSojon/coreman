package com.coreman.dto.request;

import java.math.BigDecimal;

/**
 * Optional filters for the public product listing. Every field may be null.
 * sort: newest (default) | price_asc | price_desc | name | popular (units sold)
 */
public record ProductFilter(
        String q,
        String category,
        String gender,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String size,
        String color,
        Boolean featured,
        Boolean sale,
        String sort,
        Boolean newArrivals,
        Boolean bestSellers,
        String campaign          // campaign slug: only products in that live sale
) {
    /** Backwards-compatible constructor for callers that don't use collections. */
    public ProductFilter(String q, String category, String gender, BigDecimal minPrice, BigDecimal maxPrice,
                         String size, String color, Boolean featured, Boolean sale, String sort) {
        this(q, category, gender, minPrice, maxPrice, size, color, featured, sale, sort, null, null, null);
    }
}
