package com.coreman.dto.request;

import java.math.BigDecimal;

/**
 * Optional filters for the public product listing. Every field may be null.
 * sort: newest (default) | price_asc | price_desc | name
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
        String sort
) {}
