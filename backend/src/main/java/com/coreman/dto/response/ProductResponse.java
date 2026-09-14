package com.coreman.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record ProductResponse(
        Long id,
        String name,
        String slug,
        String description,
        BigDecimal basePrice,
        String brand,
        String gender,
        Boolean isFeatured,
        String categoryName,
        String categorySlug,
        Double averageRating,
        Long reviewCount,
        List<VariantResponse> variants,
        List<ImageResponse> images
) {
    public record VariantResponse(
            Long id,
            String size,
            String color,
            String colorHex,
            String sku,
            BigDecimal price,
            Integer stockQuantity,
            String imageUrl
    ) {}

    public record ImageResponse(
            Long id,
            String imageUrl,
            Integer displayOrder,
            Boolean isPrimary
    ) {}
}
