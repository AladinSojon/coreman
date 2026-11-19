package com.coreman.controller.admin;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Review;
import com.coreman.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@Slf4j
@RestController
@RequestMapping("/api/admin/reviews")
@RequiredArgsConstructor
public class AdminReviewController {

    private final ReviewRepository reviewRepository;

    public record ReviewRow(Long id, String productName, String productSlug, String customerName, String customerEmail,
                            Integer rating, String comment, LocalDateTime createdAt) {}

    /** ?rating=1..5&page=0&size=20 — newest first. */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<ReviewRow>> list(
            @RequestParam(required = false) Integer rating,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100));
        Page<Review> reviews = rating == null
                ? reviewRepository.findAllByOrderByCreatedAtDesc(pr)
                : reviewRepository.findByRatingOrderByCreatedAtDesc(rating, pr);
        return ResponseEntity.ok(reviews.map(r -> new ReviewRow(r.getId(),
                r.getProduct().getName(), r.getProduct().getSlug(),
                (r.getUser().getFirstName() + " " + r.getUser().getLastName()).trim(), r.getUser().getEmail(),
                r.getRating(), r.getComment(), r.getCreatedAt())));
    }

    /** Remove a review (spam, abuse, wrong product). The customer can then write a new one. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Review r = reviewRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Review not found"));
        reviewRepository.delete(r);
        log.info("[ADMIN] Review deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }
}
