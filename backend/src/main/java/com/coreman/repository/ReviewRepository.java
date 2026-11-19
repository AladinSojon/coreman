package com.coreman.repository;

import com.coreman.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = {"product", "user"})
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"product", "user"})
    Page<Review> findByRatingOrderByCreatedAtDesc(Integer rating, Pageable pageable);

    Page<Review> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    Optional<Review> findByProductIdAndUserId(Long productId, Long userId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.product.id = :productId")
    Double getAverageRatingByProductId(@Param("productId") Long productId);

    long countByProductId(Long productId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Review r WHERE r.product.id = :productId")
    void deleteByProductId(@Param("productId") Long productId);

    /** Rows of [rating, count] for the star breakdown. */
    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.product.id = :productId GROUP BY r.rating")
    List<Object[]> countByRating(@Param("productId") Long productId);
}
