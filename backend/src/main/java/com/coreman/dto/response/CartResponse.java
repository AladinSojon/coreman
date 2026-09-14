package com.coreman.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
        List<CartItemResponse> items,
        BigDecimal subtotal,
        int totalItems
) {
    public record CartItemResponse(
            Long id,
            Long variantId,
            String productName,
            String productSlug,
            String size,
            String color,
            String imageUrl,
            BigDecimal unitPrice,
            Integer quantity,
            BigDecimal totalPrice,
            Integer stockQuantity
    ) {}
}
