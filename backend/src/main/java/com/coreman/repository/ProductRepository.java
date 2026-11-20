package com.coreman.repository;

import com.coreman.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    @Query("SELECT DISTINCT v.size FROM ProductVariant v WHERE v.product.isActive = true AND v.size IS NOT NULL AND v.size <> ''")
    List<String> findActiveSizes();

    @Query("SELECT DISTINCT v.color, v.colorHex FROM ProductVariant v WHERE v.product.isActive = true AND v.color IS NOT NULL AND v.color <> '' ORDER BY v.color")
    List<Object[]> findActiveColors();

    @Query("SELECT MIN(p.basePrice), MAX(p.basePrice) FROM Product p WHERE p.isActive = true")
    List<Object[]> findActivePriceRange();

    @EntityGraph(attributePaths = {"category"})
    Optional<Product> findBySlug(String slug);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.isActive = true AND p.isFeatured = true")
    List<Product> findFeaturedProducts();

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.isActive = true AND p.category.slug = :categorySlug")
    Page<Product> findByCategorySlug(@Param("categorySlug") String categorySlug, Pageable pageable);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.isActive = true AND " +
            "(LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.description) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(p.brand) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Product> search(@Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"category"})
    Page<Product> findByIsActiveTrue(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"category"})
    Page<Product> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"category"})
    Optional<Product> findById(Long id);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.isActive = true AND p.category.slug IN :slugs")
    Page<Product> findByCategorySlugs(@Param("slugs") List<String> slugs, Pageable pageable);

    List<Product> findByCategoryId(Long categoryId);

    long countByIsActiveTrue();

    @Query("SELECT p.id FROM Product p WHERE p.isActive = true AND p.isFeatured = true ORDER BY p.createdAt DESC")
    List<Long> findFeaturedIds();

    boolean existsBySlug(String slug);

    @Query("SELECT p.id FROM Product p WHERE p.category.id IN :categoryIds")
    List<Long> findIdsByCategoryIds(@Param("categoryIds") java.util.Collection<Long> categoryIds);
}
