package com.coreman.controller;

import com.coreman.config.RateLimiter;
import com.coreman.dto.request.GuestOrderRequest;
import com.coreman.dto.response.CartResponse;
import com.coreman.dto.response.OrderResponse;
import com.coreman.exception.TooManyRequestsException;
import com.coreman.model.Order;
import com.coreman.service.CartService;
import com.coreman.service.OrderService;
import com.coreman.service.SslCommerzService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Shopping without an account. Public endpoints, so each is rate-limited per visitor.
 * Phone numbers are sent in the request body (never in URLs).
 */
@RestController
@RequestMapping("/api/guest")
@RequiredArgsConstructor
public class GuestController {

    private final OrderService orderService;
    private final CartService cartService;
    private final SslCommerzService sslCommerz;
    private final RateLimiter limiter;

    private static final long HOUR = 60 * 60 * 1000L;

    public record CartPreviewRequest(List<GuestOrderRequest.Item> items) {}
    public record TrackRequest(String orderNumber, String phone) {}

    /** Prices, names, images and stock for a browser-side cart (authoritative values from the database). */
    @PostMapping("/cart/preview")
    public CartResponse previewCart(@RequestBody CartPreviewRequest body, HttpServletRequest req) {
        limit(req, "preview", 300, "Too many requests — please wait a moment.");
        return cartService.preview(body.items());
    }

    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> placeOrder(@RequestBody GuestOrderRequest body, HttpServletRequest req) {
        limit(req, "order", 8, "Too many orders from this connection. Please try again later or contact us on WhatsApp.");
        return ResponseEntity.status(HttpStatus.CREATED).body(orderService.placeGuestOrder(body));
    }

    @PostMapping("/orders/track")
    public OrderResponse track(@RequestBody TrackRequest body, HttpServletRequest req) {
        limit(req, "track", 30, "Too many lookups — please wait a few minutes.");
        return orderService.trackOrder(body.orderNumber(), body.phone());
    }

    @PostMapping("/orders/cancel")
    public OrderResponse cancel(@RequestBody TrackRequest body, HttpServletRequest req) {
        limit(req, "track", 30, "Too many requests — please wait a few minutes.");
        return orderService.cancelTrackedOrder(body.orderNumber(), body.phone());
    }

    /** Start / retry online payment for a guest order (order number + phone prove ownership). */
    @PostMapping("/payments/init")
    @Transactional
    public Map<String, String> initPayment(@RequestBody TrackRequest body, HttpServletRequest req) {
        limit(req, "track", 30, "Too many requests — please wait a few minutes.");
        Order order = orderService.findForPhone(body.orderNumber(), body.phone());
        return Map.of("gatewayUrl", sslCommerz.initiate(order));
    }

    private void limit(HttpServletRequest req, String bucket, int perHour, String message) {
        if (!limiter.allow(bucket + ":" + RateLimiter.clientIp(req), perHour, HOUR)) {
            throw new TooManyRequestsException(message);
        }
    }
}
