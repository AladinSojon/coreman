package com.coreman.service;

import com.coreman.dto.request.CreateReviewRequest;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Product;
import com.coreman.model.Review;
import com.coreman.model.User;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.ReviewRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public record ReviewResponse(Long id, String userName, Integer rating, String comment, LocalDateTime createdAt) {}

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getProductReviews(String productSlug, Pageable pageable) {
        Product product = productRepository.findBySlug(productSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(product.getId(), pageable)
                .map(r -> new ReviewResponse(r.getId(), r.getUser().getFirstName() + " " + r.getUser().getLastName(),
                        r.getRating(), r.getComment(), r.getCreatedAt()));
    }

    @Transactional
    public ReviewResponse addReview(String productSlug, Long userId, CreateReviewRequest request) {
        Product product = productRepository.findBySlug(productSlug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (reviewRepository.findByProductIdAndUserId(product.getId(), userId).isPresent()) {
            throw new BadRequestException("You have already reviewed this product");
        }

        Review review = Review.builder()
                .product(product).user(user)
                .rating(request.rating()).comment(request.comment())
                .build();
        review = reviewRepository.save(review);

        return new ReviewResponse(review.getId(), user.getFirstName() + " " + user.getLastName(),
                review.getRating(), review.getComment(), review.getCreatedAt());
    }
}
