package com.coreman.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    private String size;

    @Column(nullable = false)
    private String color;

    @Column(name = "color_hex")
    private String colorHex;

    @Column(unique = true, nullable = false)
    private String sku;

    @Column(name = "price_override", precision = 10, scale = 2)
    private BigDecimal priceOverride;

    @Column(name = "stock_quantity", nullable = false)
    @Builder.Default
    private Integer stockQuantity = 0;

    @Column(name = "image_url")
    private String imageUrl;

    public BigDecimal getEffectivePrice() {
        return priceOverride != null ? priceOverride : product.getBasePrice();
    }
}
