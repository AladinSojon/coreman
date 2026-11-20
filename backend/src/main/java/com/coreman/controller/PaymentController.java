package com.coreman.controller;

import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Order;
import com.coreman.repository.OrderRepository;
import com.coreman.security.UserPrincipal;
import com.coreman.service.SslCommerzService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payments/sslcommerz")
@RequiredArgsConstructor
public class PaymentController {

    private final SslCommerzService sslCommerz;
    private final OrderRepository orderRepository;

    /** Where the customer lands after paying (the shop's Orders page). */
    @Value("${coreman.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("enabled", sslCommerz.isEnabled(), "sandbox", sslCommerz.isSandbox());
    }

    /** Start or retry payment for the signed-in customer's own unpaid online order. */
    @PostMapping("/init")
    @Transactional
    public Map<String, String> init(@RequestBody Map<String, String> body, @AuthenticationPrincipal UserPrincipal principal) {
        Order order = orderRepository.findByOrderNumber(body.getOrDefault("orderNumber", ""))
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        if (!order.getUser().getId().equals(principal.getId())) throw new BadRequestException("Order not found");
        return Map.of("gatewayUrl", sslCommerz.initiate(order));
    }

    // SSLCommerz sends the customer's browser back to these with form data (POST); GET is accepted too.

    @RequestMapping(value = "/success", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Void> success(HttpServletRequest req) { return finish(req); }

    @RequestMapping(value = "/fail", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Void> fail(HttpServletRequest req) { return finish(req); }

    @RequestMapping(value = "/cancel", method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Void> cancel(HttpServletRequest req) { return finish(req); }

    /** Server-to-server notification; works even if the customer closes the browser before returning. */
    @PostMapping("/ipn")
    public ResponseEntity<String> ipn(HttpServletRequest req) {
        sslCommerz.handleCallback(params(req), "IPN");
        return ResponseEntity.ok("OK");
    }

    private ResponseEntity<Void> finish(HttpServletRequest req) {
        SslCommerzService.Result r = sslCommerz.handleCallback(params(req), "redirect");
        String payment = switch (r.outcome()) {
            case PAID, ALREADY_PAID -> "success";
            case CANCELLED -> "cancelled";
            default -> "failed";
        };
        // Guests have no My Orders page; send them to Track Order (they re-enter their phone there).
        boolean guest = r.orderNumber() != null && orderRepository.findByOrderNumber(r.orderNumber())
                .map(o -> Boolean.TRUE.equals(o.getUser().getGuest())).orElse(false);
        String target = frontendUrl + (guest ? "/track" : "/orders") + "?payment=" + payment
                + (r.orderNumber() != null ? "&order=" + URLEncoder.encode(r.orderNumber(), StandardCharsets.UTF_8) : "");
        return ResponseEntity.status(HttpStatus.SEE_OTHER).header(HttpHeaders.LOCATION, URI.create(target).toString()).build();
    }

    private static Map<String, String> params(HttpServletRequest req) {
        Map<String, String> m = new HashMap<>();
        req.getParameterMap().forEach((k, v) -> { if (v != null && v.length > 0) m.put(k, v[0]); });
        return m;
    }
}
