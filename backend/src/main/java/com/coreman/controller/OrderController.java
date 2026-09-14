package com.coreman.controller;

import com.coreman.dto.request.PlaceOrderRequest;
import com.coreman.dto.response.OrderResponse;
import com.coreman.security.UserPrincipal;
import com.coreman.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> placeOrder(@AuthenticationPrincipal UserPrincipal principal,
                                                     @Valid @RequestBody PlaceOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeOrder(principal.getId(), request));
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> getOrders(@AuthenticationPrincipal UserPrincipal principal,
                                                          @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(orderService.getUserOrders(principal.getId(), pageable));
    }

    @GetMapping("/{orderNumber}")
    public ResponseEntity<OrderResponse> getOrder(@AuthenticationPrincipal UserPrincipal principal,
                                                   @PathVariable String orderNumber) {
        return ResponseEntity.ok(orderService.getOrderByNumber(orderNumber, principal.getId()));
    }

    @PostMapping("/{orderNumber}/cancel")
    public ResponseEntity<OrderResponse> cancel(@AuthenticationPrincipal UserPrincipal principal,
                                                 @PathVariable String orderNumber) {
        return ResponseEntity.ok(orderService.cancelOrder(orderNumber, principal.getId()));
    }
}
