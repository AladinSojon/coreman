package com.coreman.controller;

import com.coreman.dto.request.CreateReviewRequest;
import com.coreman.security.UserPrincipal;
import com.coreman.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products/{slug}/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @GetMapping
    public ResponseEntity<Page<ReviewService.ReviewResponse>> getReviews(
            @PathVariable String slug, @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(reviewService.getProductReviews(slug, pageable));
    }

    @PostMapping
    public ResponseEntity<ReviewService.ReviewResponse> addReview(
            @PathVariable String slug, @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.addReview(slug, principal.getId(), request));
    }
}
