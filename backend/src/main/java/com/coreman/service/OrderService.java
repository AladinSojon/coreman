package com.coreman.service;

import com.coreman.dto.request.PlaceOrderRequest;
import com.coreman.dto.response.OrderResponse;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.*;
import com.coreman.model.enums.OrderStatus;
import com.coreman.model.enums.PaymentStatus;
import com.coreman.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository variantRepository;

    @Transactional
    public OrderResponse placeOrder(Long userId, PlaceOrderRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<CartItem> cartItems = cartItemRepository.findByUserIdOrderByAddedAtDesc(userId);
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Cart is empty");
        }

        // Calculate totals
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CartItem cartItem : cartItems) {
            ProductVariant variant = cartItem.getVariant();
            if (variant.getStockQuantity() < cartItem.getQuantity()) {
                throw new BadRequestException("Insufficient stock for: " + variant.getProduct().getName()
                        + " (" + variant.getSize() + "/" + variant.getColor() + ")");
            }
            subtotal = subtotal.add(variant.getEffectivePrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
        }

        BigDecimal shippingCost = subtotal.compareTo(new BigDecimal("100")) >= 0
                ? BigDecimal.ZERO : new BigDecimal("9.99");
        BigDecimal tax = subtotal.multiply(new BigDecimal("0.08")).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(shippingCost).add(tax);

        // Create order
        Order order = Order.builder()
                .orderNumber("CM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .status(OrderStatus.PENDING)
                .paymentStatus(PaymentStatus.UNPAID)
                .subtotal(subtotal)
                .shippingCost(shippingCost)
                .tax(tax)
                .total(total)
                .build();

        // Create order items and decrement stock
        for (CartItem cartItem : cartItems) {
            ProductVariant variant = cartItem.getVariant();
            Product product = variant.getProduct();

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .variant(variant)
                    .productName(product.getName())
                    .size(variant.getSize())
                    .color(variant.getColor())
                    .quantity(cartItem.getQuantity())
                    .unitPrice(variant.getEffectivePrice())
                    .build();

            order.getItems().add(orderItem);

            // Decrement stock
            variant.setStockQuantity(variant.getStockQuantity() - cartItem.getQuantity());
            variantRepository.save(variant);
        }

        order = orderRepository.save(order);

        // Clear cart
        cartItemRepository.deleteByUserId(userId);

        log.info("[ORDER] Order placed: orderNumber={}, userId={}, total={}", order.getOrderNumber(), userId, total);

        return mapToResponse(order);
    }

    @Transactional(readOnly = true)
    public Page<OrderResponse> getUserOrders(Long userId, Pageable pageable) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderByNumber(String orderNumber, Long userId) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Order does not belong to user");
        }

        return mapToResponse(order);
    }

    @Transactional
    public OrderResponse cancelOrder(String orderNumber, Long userId) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));

        if (!order.getUser().getId().equals(userId)) {
            throw new BadRequestException("Order does not belong to user");
        }

        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BadRequestException("Order cannot be cancelled in current status: " + order.getStatus());
        }

        // Restore stock
        for (OrderItem item : order.getItems()) {
            if (item.getVariant() != null) {
                ProductVariant variant = item.getVariant();
                variant.setStockQuantity(variant.getStockQuantity() + item.getQuantity());
                variantRepository.save(variant);
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);

        log.info("[ORDER] Order cancelled: orderNumber={}, userId={}", orderNumber, userId);

        return mapToResponse(order);
    }

    private OrderResponse mapToResponse(Order order) {
        List<OrderResponse.OrderItemResponse> items = order.getItems().stream()
                .map(item -> new OrderResponse.OrderItemResponse(
                        item.getProductName(),
                        item.getSize(),
                        item.getColor(),
                        item.getQuantity(),
                        item.getUnitPrice()
                ))
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name(),
                order.getPaymentStatus().name(),
                order.getSubtotal(),
                order.getShippingCost(),
                order.getTax(),
                order.getTotal(),
                order.getCreatedAt(),
                items
        );
    }
}
