package com.coreman.controller;

import com.coreman.dto.request.AddToCartRequest;
import com.coreman.dto.response.CartResponse;
import com.coreman.security.UserPrincipal;
import com.coreman.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(cartService.getCart(principal.getId()));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(@AuthenticationPrincipal UserPrincipal principal,
                                                 @Valid @RequestBody AddToCartRequest request) {
        return ResponseEntity.ok(cartService.addToCart(principal.getId(), request));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<CartResponse> updateItem(@AuthenticationPrincipal UserPrincipal principal,
                                                    @PathVariable Long id, @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(cartService.updateCartItem(principal.getId(), id, body.get("quantity")));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> removeItem(@AuthenticationPrincipal UserPrincipal principal, @PathVariable Long id) {
        cartService.removeCartItem(principal.getId(), id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart(@AuthenticationPrincipal UserPrincipal principal) {
        cartService.clearCart(principal.getId());
        return ResponseEntity.noContent().build();
    }
}
