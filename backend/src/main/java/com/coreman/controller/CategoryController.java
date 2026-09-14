package com.coreman.controller;

import com.coreman.dto.response.CategoryResponse;
import com.coreman.dto.response.ProductResponse;
import com.coreman.service.CategoryService;
import com.coreman.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final ProductService productService;

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAll() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @GetMapping("/{slug}/products")
    public ResponseEntity<Page<ProductResponse>> getProductsByCategory(
            @PathVariable String slug, @PageableDefault(size = 12) Pageable pageable) {
        return ResponseEntity.ok(productService.getProductsByCategory(slug, pageable));
    }
}
