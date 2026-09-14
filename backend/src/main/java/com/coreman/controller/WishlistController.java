package com.coreman.controller;

import com.coreman.dto.response.ProductResponse;
import com.coreman.security.UserPrincipal;
import com.coreman.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getWishlist(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(wishlistService.getWishlist(principal.getId()));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<Void> add(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long productId) {
        wishlistService.addToWishlist(principal.getId(), productId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long productId) {
        wishlistService.removeFromWishlist(principal.getId(), productId);
        return ResponseEntity.noContent().build();
    }
}
