package com.coreman.controller.admin;

import com.coreman.model.Category;
import com.coreman.model.Product;
import com.coreman.model.ProductImage;
import com.coreman.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Whole-catalogue stock view for the admin Inventory page: every product (active and hidden)
 * with its department, category path and per-variant stock, in one response.
 */
@RestController
@RequestMapping("/api/admin/inventory")
@RequiredArgsConstructor
public class AdminInventoryController {

    private final ProductRepository productRepository;

    public record VariantStock(Long id, String size, String color, String colorHex, String sku, int stock) {}

    public record ProductStock(Long id, String name, String slug, String gender, boolean active,
                               String imageUrl, Long categoryId, List<String> categoryPath, Integer categoryOrder,
                               List<VariantStock> variants) {}

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductStock>> all() {
        List<Product> products = productRepository.findAll(Sort.by("name"));
        return ResponseEntity.ok(products.stream().map(this::toRow).toList());
    }

    private ProductStock toRow(Product p) {
        List<String> path = new ArrayList<>();
        Integer order = null;
        for (Category c = p.getCategory(); c != null; c = c.getParent()) {
            path.add(c.getName());
            if (order == null) order = c.getDisplayOrder();
        }
        Collections.reverse(path);

        String image = p.getImages().stream()
                .filter(i -> Boolean.TRUE.equals(i.getIsPrimary())).map(ProductImage::getImageUrl).findFirst()
                .orElse(p.getImages().isEmpty() ? null : p.getImages().get(0).getImageUrl());

        List<VariantStock> variants = p.getVariants().stream()
                .map(v -> new VariantStock(v.getId(), v.getSize(), v.getColor(), v.getColorHex(), v.getSku(),
                        v.getStockQuantity() == null ? 0 : v.getStockQuantity()))
                .toList();

        return new ProductStock(p.getId(), p.getName(), p.getSlug(),
                p.getGender() != null ? p.getGender().name() : "UNISEX", Boolean.TRUE.equals(p.getIsActive()),
                image, p.getCategory() != null ? p.getCategory().getId() : null, path, order, variants);
    }
}
