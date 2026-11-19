package com.coreman.service;

import com.coreman.dto.request.CreateReviewRequest;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Product;
import com.coreman.model.Review;
import com.coreman.model.User;
import com.coreman.repository.OrderRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.ReviewRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;

    public record ReviewResponse(Long id, String userName, Integer rating, String comment, LocalDateTime createdAt) {}

    /** canReview plus a short reason the UI can show when it is false. */
    public record ReviewEligibility(boolean canReview, String reason) {}

    /** Count of reviews per star (5 → 1) for the rating breakdown bar chart. */
    public record ReviewSummary(Double average, long total, Map<Integer, Long> counts) {}

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getProductReviews(String productSlug, Pageable pageable) {
        Product product = findProduct(productSlug);
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(product.getId(), pageable)
                .map(r -> new ReviewResponse(r.getId(), displayName(r.getUser()),
                        r.getRating(), r.getComment(), r.getCreatedAt()));
    }

    @Transactional(readOnly = true)
    public ReviewSummary getSummary(String productSlug) {
        Product product = findProduct(productSlug);
        Map<Integer, Long> counts = new TreeMap<>(java.util.Comparator.reverseOrder());
        for (int star = 5; star >= 1; star--) counts.put(star, 0L);
        long total = 0;
        for (Object[] row : reviewRepository.countByRating(product.getId())) {
            int star = ((Number) row[0]).intValue();
            long n = ((Number) row[1]).longValue();
            counts.put(star, n);
            total += n;
        }
        Double avg = reviewRepository.getAverageRatingByProductId(product.getId());
        return new ReviewSummary(avg != null ? Math.round(avg * 10.0) / 10.0 : null, total, counts);
    }

    @Transactional(readOnly = true)
    public ReviewEligibility checkEligibility(String productSlug, Long userId) {
        if (userId == null) return new ReviewEligibility(false, "Sign in to write a review.");
        Product product = findProduct(productSlug);
        if (reviewRepository.findByProductIdAndUserId(product.getId(), userId).isPresent()) {
            return new ReviewEligibility(false, "You've already reviewed this product.");
        }
        if (!orderRepository.hasDeliveredPurchase(userId, product.getId())) {
            return new ReviewEligibility(false, "Only customers who received this product can review it.");
        }
        return new ReviewEligibility(true, null);
    }

    @Transactional
    public ReviewResponse addReview(String productSlug, Long userId, CreateReviewRequest request) {
        Product product = findProduct(productSlug);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ReviewEligibility eligibility = checkEligibility(productSlug, userId);
        if (!eligibility.canReview()) {
            throw new BadRequestException(eligibility.reason());
        }

        String comment = request.comment() == null ? null : request.comment().trim();
        Review review = Review.builder()
                .product(product).user(user)
                .rating(request.rating()).comment(comment == null || comment.isEmpty() ? null : comment)
                .build();
        review = reviewRepository.save(review);

        return new ReviewResponse(review.getId(), displayName(user),
                review.getRating(), review.getComment(), review.getCreatedAt());
    }

    private Product findProduct(String slug) {
        return productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    /** "Rahim U." — first name plus last initial, so full names aren't published. */
    private static String displayName(User u) {
        String first = u.getFirstName() == null ? "" : u.getFirstName().trim();
        String last = u.getLastName() == null ? "" : u.getLastName().trim();
        if (first.isEmpty()) return "Customer";
        return last.isEmpty() ? first : first + " " + last.charAt(0) + ".";
    }
}
