package com.coreman.service;

import com.coreman.dto.request.GuestOrderRequest;
import com.coreman.dto.request.PlaceOrderRequest;
import com.coreman.dto.response.OrderResponse;
import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.*;
import com.coreman.model.enums.OrderStatus;
import com.coreman.model.enums.PaymentMethod;
import com.coreman.model.enums.PaymentStatus;
import com.coreman.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductVariantRepository variantRepository;
    private final AddressRepository addressRepository;
    private final SslCommerzService sslCommerz;
    private final CampaignService campaignService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    /** One line of an order before it is saved. */
    private record Line(ProductVariant variant, int quantity) {}

    @Transactional
    public OrderResponse placeOrder(Long userId, PlaceOrderRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<CartItem> cartItems = cartItemRepository.findByUserIdOrderByAddedAtDesc(userId);
        if (cartItems.isEmpty()) {
            throw new BadRequestException("Cart is empty");
        }

        // Look up shipping address — it must belong to this user.
        Address shippingAddress = addressRepository.findById(request.shippingAddressId())
                .filter(a -> a.getUser() != null && a.getUser().getId().equals(userId))
                .orElseThrow(() -> new BadRequestException("Shipping address not found"));
        if (shippingAddress.getPhone() == null || shippingAddress.getPhone().isBlank()) {
            throw new BadRequestException("A phone number is required so the courier can reach you");
        }

        List<Line> lines = cartItems.stream().map(ci -> new Line(ci.getVariant(), ci.getQuantity())).toList();
        Order order = createOrder(user, shippingAddress, lines, request.paymentMethod());
        cartItemRepository.deleteByUserId(userId);
        return mapToResponse(order);
    }

    /**
     * Checkout without an account. The order is linked to a guest customer record keyed by phone number
     * (it can't sign in and is never merged into a registered account), so admin views keep working and a
     * guest's repeat orders group together.
     */
    @Transactional
    public OrderResponse placeGuestOrder(GuestOrderRequest req) {
        String phone = Phones.normalize(req.phone());
        if (phone == null) throw new BadRequestException("Please enter a valid Bangladeshi mobile number, e.g. 01712345678.");
        if (req.items() == null || req.items().isEmpty()) throw new BadRequestException("Your cart is empty.");
        if (req.items().size() > 30) throw new BadRequestException("Too many different items in one order.");

        Map<Long, Integer> qty = new LinkedHashMap<>();
        for (GuestOrderRequest.Item it : req.items()) {
            if (it == null || it.variantId() == null || it.quantity() == null || it.quantity() < 1) continue;
            qty.merge(it.variantId(), it.quantity(), Integer::sum);
        }
        if (qty.isEmpty()) throw new BadRequestException("Your cart is empty.");

        List<Line> lines = new ArrayList<>();
        for (Map.Entry<Long, Integer> e : qty.entrySet()) {
            if (e.getValue() > 20) throw new BadRequestException("Maximum 20 of one item per order.");
            ProductVariant v = variantRepository.findById(e.getKey())
                    .filter(x -> Boolean.TRUE.equals(x.getProduct().getIsActive()))
                    .orElseThrow(() -> new BadRequestException("An item in your cart is no longer available. Please review your cart."));
            lines.add(new Line(v, e.getValue()));
        }

        String name = req.recipientName() == null ? "" : req.recipientName().trim();
        if (name.isEmpty() || isBlank(req.street()) || isBlank(req.city()) || isBlank(req.zipCode())) {
            throw new BadRequestException("Please fill in your name and full delivery address.");
        }

        User guest = findOrCreateGuest(phone, name);
        Address address = addressRepository.save(Address.builder()
                .user(guest).label("Shipping").recipientName(truncate(name, 120)).phone(phone)
                .street(truncate(req.street().trim(), 250)).city(truncate(req.city().trim(), 100))
                .zipCode(truncate(req.zipCode().trim(), 20)).country("Bangladesh").isDefault(true)
                .build());

        Order order = createOrder(guest, address, lines, req.paymentMethod());
        log.info("[ORDER] Guest order: {} phone=***{}", order.getOrderNumber(), phone.substring(phone.length() - 3));
        return mapToResponse(order);
    }

    /** Order details for a guest who knows the order number and the phone number it was placed with. */
    @Transactional(readOnly = true)
    public OrderResponse trackOrder(String orderNumber, String phone) {
        return mapToResponse(findForPhone(orderNumber, phone));
    }

    /** Guests can cancel an unpaid Pending/Confirmed order with the order number + phone. */
    @Transactional
    public OrderResponse cancelTrackedOrder(String orderNumber, String phone) {
        Order order = findForPhone(orderNumber, phone);
        return cancelOrder(order.getOrderNumber(), order.getUser().getId());
    }

    public Order findForPhone(String orderNumber, String phone) {
        String p = Phones.normalize(phone);
        Order order = orderNumber == null ? null : orderRepository.findByOrderNumber(orderNumber.trim().toUpperCase()).orElse(null);
        String orderPhone = order == null || order.getShippingAddress() == null ? null : Phones.normalize(order.getShippingAddress().getPhone());
        if (p == null || orderPhone == null || !orderPhone.equals(p)) {
            // Same message whether the order or the phone is wrong, so numbers can't be probed.
            throw new ResourceNotFoundException("We couldn't find an order with that number and phone.");
        }
        return order;
    }

    private User findOrCreateGuest(String phone, String name) {
        String email = "guest-" + phone + "@guest.coreman.local";
        return userRepository.findByEmail(email).orElseGet(() -> {
            String[] parts = name.split("\\s+", 2);
            return userRepository.save(User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString())) // unknown to anyone: can't sign in (BCrypt max 72 bytes)
                    .firstName(truncate(parts[0], 60))
                    .lastName(parts.length > 1 ? truncate(parts[1], 60) : "")
                    .phone(phone)
                    .guest(true)
                    .build());
        });
    }

    /** Shared by account and guest checkout: checks stock, prices from the database, decrements stock. */
    private Order createOrder(User user, Address shippingAddress, List<Line> lines, PaymentMethod requestedMethod) {
        BigDecimal subtotal = BigDecimal.ZERO;
        // Price each line once, so the total and the line prices agree even if a sale starts or ends mid-checkout.
        java.util.Map<Line, CampaignService.Price> prices = new java.util.IdentityHashMap<>();
        for (Line line : lines) {
            ProductVariant variant = line.variant();
            prices.put(line, campaignService.priceFor(variant));
            if (variant.getStockQuantity() < line.quantity()) {
                throw new BadRequestException("Insufficient stock for: " + variant.getProduct().getName()
                        + " (" + variant.getSize() + "/" + variant.getColor() + ")");
            }
            subtotal = subtotal.add(prices.get(line).price().multiply(BigDecimal.valueOf(line.quantity())));
        }

        BigDecimal shippingCost = subtotal.compareTo(new BigDecimal("2000")) >= 0
                ? BigDecimal.ZERO : new BigDecimal("120");
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal total = subtotal.add(shippingCost);

        PaymentMethod paymentMethod = requestedMethod != null ? requestedMethod : PaymentMethod.COD;
        if (paymentMethod == PaymentMethod.SSLCOMMERZ && !sslCommerz.isEnabled()) {
            throw new BadRequestException("Online payment isn't available right now. Please choose Cash on Delivery.");
        }
        if (paymentMethod == PaymentMethod.SSLCOMMERZ && total.compareTo(new BigDecimal("10")) < 0) {
            throw new BadRequestException("Online payment needs an order total of at least ৳10.");
        }

        Order order = Order.builder()
                .orderNumber("CM-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .user(user)
                .shippingAddress(shippingAddress)
                .status(OrderStatus.PENDING)
                .paymentMethod(paymentMethod)
                .paymentStatus(PaymentStatus.UNPAID)
                .subtotal(subtotal)
                .shippingCost(shippingCost)
                .tax(tax)
                .total(total)
                .build();

        for (Line line : lines) {
            ProductVariant variant = line.variant();
            Product product = variant.getProduct();
            CampaignService.Price price = prices.get(line);
            order.getItems().add(OrderItem.builder()
                    .order(order)
                    .variant(variant)
                    .productName(product.getName())
                    .size(variant.getSize())
                    .color(variant.getColor())
                    .quantity(line.quantity())
                    .unitPrice(price.price())
                    .campaignId(price.campaign() != null ? price.campaign().getId() : null)
                    .build());
            variant.setStockQuantity(variant.getStockQuantity() - line.quantity());
            variantRepository.save(variant);
        }

        order = orderRepository.save(order);
        log.info("[ORDER] Order placed: orderNumber={}, userId={}, total={}", order.getOrderNumber(), user.getId(), total);
        return order;
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }
    private static String truncate(String s, int max) { return s.length() <= max ? s : s.substring(0, max); }

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

        // A paid order needs a refund through the payment gateway, so staff handle that cancellation.
        if (order.getPaymentStatus() == PaymentStatus.PAID) {
            throw new BadRequestException("This order is already paid. Please contact us to cancel it and get a refund.");
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
                (order.getPaymentMethod() != null ? order.getPaymentMethod() : PaymentMethod.COD).name(),
                order.getSubtotal(),
                order.getShippingCost(),
                order.getTax(),
                order.getTotal(),
                order.getCreatedAt(),
                items
        );
    }
}
