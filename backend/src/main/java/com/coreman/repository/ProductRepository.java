package com.coreman.repository;

import com.coreman.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"images", "variants", "category"})
    Optional<Product> findBySlug(String slug);

    @EntityGraph(attributePaths = {"images", "variants", "category"})
    @Query("SELECT DISTINCT p FROM Product p WHERE p.isActive = true AND p.isFeatured = true")
    List<Product> findFeaturedProducts();

    @EntityGraph(attributePaths = {"images", "variants", "category"})
    @Query("SELECT DISTINCT p FROM Product p WHERE p.isActive = true AND p.category.slug = :categorySlug")
    Page<Product> findByCategorySlug(@Param("categorySlug") String categorySlug, Pageable pageable);

    @EntityGraph(attributePaths = {"images", "variants", "category"})
    @Query("SELECT DISTINCT p FROM Product p WHERE p.isActive = true AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.brand) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Product> search(@Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"images", "variants", "category"})
    Page<Product> findByIsActiveTrue(Pageable pageable);
}
