package com.coreman.dto.response;

import java.math.BigDecimal;
import java.util.List;

/** Options the shop sidebar can offer, based on active products. */
public record ProductFacets(
        List<String> sizes,
        List<ColorOption> colors,
        BigDecimal minPrice,
        BigDecimal maxPrice
) {
    public record ColorOption(String name, String hex) {}
}
