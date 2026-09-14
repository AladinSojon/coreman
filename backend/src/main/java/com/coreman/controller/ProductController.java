package com.coreman.controller;

import com.coreman.dto.response.ProductResponse;
import com.coreman.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getProducts(@PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(productService.getProducts(pageable));
    }

    @GetMapping("/featured")
    public ResponseEntity<List<ProductResponse>> getFeatured() {
        return ResponseEntity.ok(productService.getFeaturedProducts());
    }

    @GetMapping("/search")
    public ResponseEntity<Page<ProductResponse>> search(@RequestParam String q, @PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(productService.searchProducts(q, pageable));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProductResponse> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(productService.getProductBySlug(slug));
    }
}
