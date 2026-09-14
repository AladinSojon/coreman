package com.coreman.service;

import com.coreman.dto.response.ProductResponse;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Product;
import com.coreman.model.User;
import com.coreman.model.WishlistItem;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.UserRepository;
import com.coreman.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    @Transactional(readOnly = true)
    public List<ProductResponse> getWishlist(Long userId) {
        return wishlistRepository.findByUserIdOrderByAddedAtDesc(userId).stream()
                .map(item -> productService.getProductBySlug(item.getProduct().getSlug()))
                .toList();
    }

    @Transactional
    public void addToWishlist(Long userId, Long productId) {
        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)) return;
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Product product = productRepository.findById(productId).orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        wishlistRepository.save(WishlistItem.builder().user(user).product(product).build());
    }

    @Transactional
    public void removeFromWishlist(Long userId, Long productId) {
        wishlistRepository.findByUserIdAndProductId(userId, productId).ifPresent(wishlistRepository::delete);
    }
}
