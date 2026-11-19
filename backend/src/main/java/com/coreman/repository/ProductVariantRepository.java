package com.coreman.repository;

import com.coreman.model.ProductVariant;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    /** Variants of active products at or below the threshold, lowest stock first. */
    @Query("SELECT v FROM ProductVariant v JOIN FETCH v.product p " +
            "WHERE p.isActive = true AND v.stockQuantity <= :threshold ORDER BY v.stockQuantity ASC, p.name ASC")
    List<ProductVariant> findLowStock(@Param("threshold") int threshold, Pageable pageable);

    @Query("SELECT COUNT(v) FROM ProductVariant v WHERE v.product.isActive = true AND v.stockQuantity <= :threshold")
    long countLowStock(@Param("threshold") int threshold);

    @Query("SELECT COUNT(v) > 0 FROM OrderItem oi JOIN oi.variant v WHERE v.product.id = :productId")
    boolean productHasOrders(@Param("productId") Long productId);
}
