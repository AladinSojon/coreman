package com.coreman.service;

import com.coreman.dto.response.ProductResponse;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Product;
import com.coreman.model.ProductImage;
import com.coreman.model.ProductVariant;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;

    public Page<ProductResponse> getProducts(Pageable pageable) {
        return productRepository.findByIsActiveTrue(pageable).map(this::mapToResponse);
    }

    public ProductResponse getProductBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + slug));
        return mapToResponse(product);
    }

    public List<ProductResponse> getFeaturedProducts() {
        return productRepository.findFeaturedProducts().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Page<ProductResponse> getProductsByCategory(String categorySlug, Pageable pageable) {
        return productRepository.findByCategorySlug(categorySlug, pageable).map(this::mapToResponse);
    }

    public Page<ProductResponse> searchProducts(String query, Pageable pageable) {
        return productRepository.search(query, pageable).map(this::mapToResponse);
    }

    private ProductResponse mapToResponse(Product product) {
        Double avgRating = reviewRepository.getAverageRatingByProductId(product.getId());
        long reviewCount = reviewRepository.countByProductId(product.getId());

        List<ProductResponse.VariantResponse> variants = product.getVariants().stream()
                .map(this::mapVariant)
                .toList();

        List<ProductResponse.ImageResponse> images = product.getImages().stream()
                .map(this::mapImage)
                .toList();

        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getDescription(),
                product.getBasePrice(),
                product.getBrand(),
                product.getGender() != null ? product.getGender().name() : null,
                product.getIsFeatured(),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getCategory() != null ? product.getCategory().getSlug() : null,
                avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null,
                reviewCount,
                variants,
                images
        );
    }

    private ProductResponse.VariantResponse mapVariant(ProductVariant v) {
        return new ProductResponse.VariantResponse(
                v.getId(), v.getSize(), v.getColor(), v.getColorHex(),
                v.getSku(), v.getEffectivePrice(), v.getStockQuantity(), v.getImageUrl()
        );
    }

    private ProductResponse.ImageResponse mapImage(ProductImage img) {
        return new ProductResponse.ImageResponse(
                img.getId(), img.getImageUrl(), img.getDisplayOrder(), img.getIsPrimary()
        );
    }
}
