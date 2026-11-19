package com.coreman.controller.admin;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Order;
import com.coreman.model.enums.OrderStatus;
import com.coreman.model.enums.PaymentMethod;
import com.coreman.model.enums.PaymentStatus;
import com.coreman.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderRepository orderRepository;

    @GetMapping
    public ResponseEntity<Page<Order>> getAll(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(orderRepository.findAll(pageable));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        OrderStatus status = OrderStatus.valueOf(body.get("status"));
        order.setStatus(status);
        // Cash on Delivery: the courier collects payment at delivery.
        if (status == OrderStatus.DELIVERED
                && (order.getPaymentMethod() == null || order.getPaymentMethod() == PaymentMethod.COD)
                && order.getPaymentStatus() == PaymentStatus.UNPAID) {
            order.setPaymentStatus(PaymentStatus.PAID);
        }
        return ResponseEntity.ok(orderRepository.save(order));
    }
}
