package com.coreman.controller.admin;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.*;
import com.coreman.model.enums.Gender;
import com.coreman.repository.CategoryRepository;
import com.coreman.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<Page<Product>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(productRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Product> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found")));
    }

    @PostMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<Product> create(@RequestBody Map<String, Object> body) {
        Product product = new Product();
        product.setName((String) body.get("name"));
        product.setSlug((String) body.get("slug"));
        product.setDescription((String) body.get("description"));
        product.setBasePrice(new BigDecimal(body.get("basePrice").toString()));
        product.setBrand((String) body.get("brand"));
        product.setGender(Gender.valueOf(((String) body.get("gender")).toUpperCase()));
        product.setIsActive(body.get("isActive") != null ? (Boolean) body.get("isActive") : true);
        product.setIsFeatured(body.get("isFeatured") != null ? (Boolean) body.get("isFeatured") : false);

        if (body.get("categoryId") != null) {
            Long categoryId = ((Number) body.get("categoryId")).longValue();
            product.setCategory(categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }

        // Images
        if (body.get("images") != null) {
            List<Map<String, Object>> images = (List<Map<String, Object>>) body.get("images");
            for (int i = 0; i < images.size(); i++) {
                Map<String, Object> img = images.get(i);
                product.getImages().add(ProductImage.builder()
                        .product(product)
                        .imageUrl((String) img.get("imageUrl"))
                        .displayOrder(i)
                        .isPrimary(i == 0)
                        .build());
            }
        }

        // Variants
        if (body.get("variants") != null) {
            List<Map<String, Object>> variants = (List<Map<String, Object>>) body.get("variants");
            for (Map<String, Object> v : variants) {
                product.getVariants().add(ProductVariant.builder()
                        .product(product)
                        .size((String) v.get("size"))
                        .color((String) v.get("color"))
                        .colorHex((String) v.get("colorHex"))
                        .sku((String) v.get("sku"))
                        .stockQuantity(v.get("stockQuantity") != null ? ((Number) v.get("stockQuantity")).intValue() : 0)
                        .build());
            }
        }

        Product saved = productRepository.save(product);
        log.info("[ADMIN] Product created: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @SuppressWarnings("unchecked")
    public ResponseEntity<Product> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        if (body.containsKey("name")) product.setName((String) body.get("name"));
        if (body.containsKey("slug")) product.setSlug((String) body.get("slug"));
        if (body.containsKey("description")) product.setDescription((String) body.get("description"));
        if (body.containsKey("basePrice")) product.setBasePrice(new BigDecimal(body.get("basePrice").toString()));
        if (body.containsKey("brand")) product.setBrand((String) body.get("brand"));
        if (body.containsKey("gender")) product.setGender(Gender.valueOf(((String) body.get("gender")).toUpperCase()));
        if (body.containsKey("isActive")) product.setIsActive((Boolean) body.get("isActive"));
        if (body.containsKey("isFeatured")) product.setIsFeatured((Boolean) body.get("isFeatured"));
        if (body.containsKey("categoryId")) {
            Long categoryId = ((Number) body.get("categoryId")).longValue();
            product.setCategory(categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }

        // Replace images
        if (body.containsKey("images")) {
            product.getImages().clear();
            List<Map<String, Object>> images = (List<Map<String, Object>>) body.get("images");
            for (int i = 0; i < images.size(); i++) {
                Map<String, Object> img = images.get(i);
                product.getImages().add(ProductImage.builder()
                        .product(product)
                        .imageUrl((String) img.get("imageUrl"))
                        .displayOrder(i)
                        .isPrimary(i == 0)
                        .build());
            }
        }

        // Replace variants
        if (body.containsKey("variants")) {
            product.getVariants().clear();
            List<Map<String, Object>> variants = (List<Map<String, Object>>) body.get("variants");
            for (Map<String, Object> v : variants) {
                product.getVariants().add(ProductVariant.builder()
                        .product(product)
                        .size((String) v.get("size"))
                        .color((String) v.get("color"))
                        .colorHex((String) v.get("colorHex"))
                        .sku((String) v.get("sku"))
                        .stockQuantity(v.get("stockQuantity") != null ? ((Number) v.get("stockQuantity")).intValue() : 0)
                        .build());
            }
        }

        Product saved = productRepository.save(product);
        log.info("[ADMIN] Product updated: {} (id={})", saved.getName(), saved.getId());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productRepository.deleteById(id);
        log.info("[ADMIN] Product deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }
}
