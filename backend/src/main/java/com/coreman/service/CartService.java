package com.coreman.service;

import com.coreman.dto.request.AddToCartRequest;
import com.coreman.dto.response.CartResponse;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.CartItem;
import com.coreman.model.Product;
import com.coreman.model.ProductVariant;
import com.coreman.model.User;
import com.coreman.repository.CartItemRepository;
import com.coreman.repository.ProductVariantRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository variantRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CartResponse getCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserIdOrderByAddedAtDesc(userId);
        return buildCartResponse(items);
    }

    @Transactional
    public CartResponse addToCart(Long userId, AddToCartRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ProductVariant variant = variantRepository.findById(request.variantId())
                .orElseThrow(() -> new ResourceNotFoundException("Product variant not found"));

        if (variant.getStockQuantity() < request.quantity()) {
            throw new BadRequestException("Insufficient stock");
        }

        Optional<CartItem> existing = cartItemRepository.findByUserIdAndVariantId(userId, request.variantId());

        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + request.quantity());
            cartItemRepository.save(item);
        } else {
            CartItem item = CartItem.builder()
                    .user(user)
                    .variant(variant)
                    .quantity(request.quantity())
                    .build();
            cartItemRepository.save(item);
        }

        return getCart(userId);
    }

    @Transactional
    public CartResponse updateCartItem(Long userId, Long itemId, int quantity) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        if (!item.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cart item does not belong to user");
        }

        if (quantity <= 0) {
            cartItemRepository.delete(item);
        } else {
            if (item.getVariant().getStockQuantity() < quantity) {
                throw new BadRequestException("Insufficient stock");
            }
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }

        return getCart(userId);
    }

    @Transactional
    public void removeCartItem(Long userId, Long itemId) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));

        if (!item.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cart item does not belong to user");
        }

        cartItemRepository.delete(item);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }

    private CartResponse buildCartResponse(List<CartItem> items) {
        List<CartResponse.CartItemResponse> itemResponses = items.stream()
                .map(this::mapCartItem)
                .toList();

        BigDecimal subtotal = itemResponses.stream()
                .map(CartResponse.CartItemResponse::totalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalItems = itemResponses.stream()
                .mapToInt(CartResponse.CartItemResponse::quantity)
                .sum();

        return new CartResponse(itemResponses, subtotal, totalItems);
    }

    private CartResponse.CartItemResponse mapCartItem(CartItem item) {
        ProductVariant variant = item.getVariant();
        Product product = variant.getProduct();
        BigDecimal unitPrice = variant.getEffectivePrice();
        BigDecimal totalPrice = unitPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

        String imageUrl = variant.getImageUrl();
        if (imageUrl == null && !product.getImages().isEmpty()) {
            imageUrl = product.getImages().stream()
                    .filter(ProductVariant -> ProductVariant.getIsPrimary())
                    .findFirst()
                    .map(img -> img.getImageUrl())
                    .orElse(product.getImages().getFirst().getImageUrl());
        }

        return new CartResponse.CartItemResponse(
                item.getId(),
                variant.getId(),
                product.getName(),
                product.getSlug(),
                variant.getSize(),
                variant.getColor(),
                imageUrl,
                unitPrice,
                item.getQuantity(),
                totalPrice,
                variant.getStockQuantity()
        );
    }
}
