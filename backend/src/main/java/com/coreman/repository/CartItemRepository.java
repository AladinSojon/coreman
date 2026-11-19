package com.coreman.repository;

import com.coreman.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    List<CartItem> findByUserIdOrderByAddedAtDesc(Long userId);

    Optional<CartItem> findByUserIdAndVariantId(Long userId, Long variantId);

    void deleteByUserId(Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM CartItem c WHERE c.variant.id IN (SELECT v.id FROM ProductVariant v WHERE v.product.id = :productId)")
    void deleteByVariantProductId(@org.springframework.data.repository.query.Param("productId") Long productId);
}
