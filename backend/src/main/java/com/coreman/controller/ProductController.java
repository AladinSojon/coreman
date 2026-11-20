package com.coreman.controller;

import com.coreman.dto.request.ProductFilter;
import com.coreman.dto.response.ProductFacets;
import com.coreman.dto.response.ProductResponse;
import com.coreman.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * Public product listing with optional filters. Example:
     * /api/products?gender=MEN&category=menswear&size=M&color=Black&minPrice=40&maxPrice=60&sale=true&sort=price_asc&page=0&size=12
     * Note: "pageSize" is the page length because "size" is the clothing-size filter.
     */
    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String color,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean sale,
            @RequestParam(required = false) Boolean newArrivals,
            @RequestParam(required = false) Boolean bestSellers,
            @RequestParam(required = false) String campaign,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int pageSize) {
        ProductFilter filter = new ProductFilter(q, category, gender, minPrice, maxPrice, size, color, featured, sale, sort,
                newArrivals, bestSellers, campaign);
        return ResponseEntity.ok(productService.filterProducts(filter, page, pageSize));
    }

    @GetMapping("/filters")
    public ResponseEntity<ProductFacets> getFilterOptions() {
        return ResponseEntity.ok(productService.getFacets());
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
