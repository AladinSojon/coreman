package com.coreman.controller.admin;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Category;
import com.coreman.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<List<Category>> getAll() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Category> create(@RequestBody Map<String, Object> body) {
        Category category = new Category();
        category.setName((String) body.get("name"));
        category.setSlug((String) body.get("slug"));
        category.setDescription((String) body.get("description"));
        category.setImageUrl((String) body.get("imageUrl"));
        category.setDisplayOrder(body.get("displayOrder") != null ? ((Number) body.get("displayOrder")).intValue() : 0);

        if (body.get("parentId") != null) {
            Long parentId = ((Number) body.get("parentId")).longValue();
            category.setParent(categoryRepository.findById(parentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent category not found")));
        }

        log.info("[ADMIN] Category created: {}", category.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryRepository.save(category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (body.containsKey("name")) category.setName((String) body.get("name"));
        if (body.containsKey("slug")) category.setSlug((String) body.get("slug"));
        if (body.containsKey("description")) category.setDescription((String) body.get("description"));
        if (body.containsKey("imageUrl")) category.setImageUrl((String) body.get("imageUrl"));
        if (body.containsKey("displayOrder")) category.setDisplayOrder(((Number) body.get("displayOrder")).intValue());

        log.info("[ADMIN] Category updated: {}", category.getName());
        return ResponseEntity.ok(categoryRepository.save(category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryRepository.deleteById(id);
        log.info("[ADMIN] Category deleted: id={}", id);
        return ResponseEntity.noContent().build();
    }
}
