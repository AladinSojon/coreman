package com.coreman.service;

import com.coreman.dto.request.ProductFilter;
import com.coreman.dto.response.ProductFacets;
import com.coreman.dto.response.ProductResponse;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.repository.ProductSpecifications;
import com.coreman.model.Category;
import com.coreman.model.Product;
import com.coreman.model.ProductImage;
import com.coreman.model.ProductVariant;
import com.coreman.repository.CategoryRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ReviewRepository reviewRepository;

    public Page<ProductResponse> getProducts(Pageable pageable) {
        return productRepository.findByIsActiveTrue(pageable).map(this::mapToResponse);
    }

    private static final List<String> SIZE_ORDER = List.of("XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL");

    public Page<ProductResponse> filterProducts(ProductFilter filter, int page, int size) {
        List<String> categorySlugs = null;
        if (filter.category() != null && !filter.category().isBlank()) {
            Category category = categoryRepository.findBySlug(filter.category())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + filter.category()));
            categorySlugs = new java.util.ArrayList<>();
            collectSlugs(category, categorySlugs);
        }
        if (filter.gender() != null && !filter.gender().isBlank()) {
            try {
                com.coreman.model.enums.Gender.valueOf(filter.gender().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Unknown gender: " + filter.gender());
            }
        }

        Sort sort = switch (filter.sort() == null ? "newest" : filter.sort()) {
            case "price_asc" -> Sort.by("basePrice").ascending().and(Sort.by("id"));
            case "price_desc" -> Sort.by("basePrice").descending().and(Sort.by("id"));
            case "name" -> Sort.by("name").ascending();
            case "newest" -> Sort.by("createdAt").descending().and(Sort.by("id").descending());
            default -> throw new BadRequestException("Unknown sort: " + filter.sort());
        };

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 48), sort);
        return productRepository.findAll(ProductSpecifications.matching(filter, categorySlugs), pageable)
                .map(this::mapToResponse);
    }

    public ProductFacets getFacets() {
        List<String> sizes = productRepository.findActiveSizes().stream()
                .sorted(Comparator.comparingInt((String s) -> {
                    int i = SIZE_ORDER.indexOf(s.toUpperCase());
                    return i < 0 ? Integer.MAX_VALUE : i;
                }).thenComparing(Comparator.naturalOrder()))
                .toList();

        // One entry per colour name (first hex wins if the same name has several shades).
        Map<String, ProductFacets.ColorOption> colors = new LinkedHashMap<>();
        for (Object[] row : productRepository.findActiveColors()) {
            String name = (String) row[0];
            colors.putIfAbsent(name.toLowerCase(), new ProductFacets.ColorOption(name, (String) row[1]));
        }

        List<Object[]> range = productRepository.findActivePriceRange();
        Object[] r = range.isEmpty() ? new Object[]{null, null} : range.get(0);
        return new ProductFacets(sizes, List.copyOf(colors.values()), (BigDecimal) r[0], (BigDecimal) r[1]);
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
        // Collect this category + all descendant slugs
        Category category = categoryRepository.findBySlug(categorySlug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categorySlug));
        List<String> slugs = new java.util.ArrayList<>();
        collectSlugs(category, slugs);
        return productRepository.findByCategorySlugs(slugs, pageable).map(this::mapToResponse);
    }

    private void collectSlugs(Category category, List<String> slugs) {
        slugs.add(category.getSlug());
        if (category.getChildren() != null) {
            for (Category child : category.getChildren()) {
                collectSlugs(child, slugs);
            }
        }
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
                product.getCompareAtPrice(),
                product.getBrand(),
                product.getGender() != null ? product.getGender().name() : null,
                product.getIsFeatured(),
                product.getCategory() != null ? product.getCategory().getName() : null,
                product.getCategory() != null ? product.getCategory().getSlug() : null,
                avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : null,
                reviewCount,
                product.getCreatedAt(),
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
