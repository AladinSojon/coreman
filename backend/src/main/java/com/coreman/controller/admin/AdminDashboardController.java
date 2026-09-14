package com.coreman.controller.admin;

import com.coreman.repository.OrderRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(Map.of(
                "totalUsers", userRepository.count(),
                "totalProducts", productRepository.count(),
                "totalOrders", orderRepository.count()
        ));
    }
}
