package com.coreman.service;

import com.coreman.dto.response.CategoryResponse;
import com.coreman.model.Category;
import com.coreman.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> getAllCategories() {
        List<Category> roots = categoryRepository.findByParentIsNullOrderByDisplayOrderAsc();
        return roots.stream().map(this::mapToResponse).toList();
    }

    private CategoryResponse mapToResponse(Category category) {
        List<CategoryResponse> children = category.getChildren().stream()
                .map(this::mapToResponse)
                .toList();

        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getDescription(),
                category.getImageUrl(),
                children
        );
    }
}
