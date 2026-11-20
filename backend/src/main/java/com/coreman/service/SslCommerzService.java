package com.coreman.service;

import com.coreman.exception.BadRequestException;
import com.coreman.model.Address;
import com.coreman.model.Order;
import com.coreman.model.enums.OrderStatus;
import com.coreman.model.enums.PaymentMethod;
import com.coreman.model.enums.PaymentStatus;
import com.coreman.repository.OrderRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * SSLCommerz payment gateway (bKash, Nagad, Rocket, cards, internet banking).
 * Docs: https://developer.sslcommerz.com/doc/v4/
 *
 * Flow: initiate a session for an unpaid order -> customer pays on SSLCommerz's page -> SSLCommerz posts to our
 * success/fail/cancel URL (browser) and IPN URL (server) -> we confirm with the Order Validation API, check
 * tran_id, amount and currency, and only then mark the order PAID. Callback data alone is never trusted.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SslCommerzService {

    private final OrderRepository orderRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    @Value("${coreman.payments.sslcommerz.store-id:}")
    private String storeId;

    @Value("${coreman.payments.sslcommerz.store-password:}")
    private String storePassword;

    @Value("${coreman.payments.sslcommerz.sandbox:true}")
    private boolean sandbox;

    /** Public URL of this backend — SSLCommerz posts the customer's browser and IPN here. */
    @Value("${coreman.backend-url:http://localhost:8080}")
    private String backendUrl;

    public boolean isEnabled() {
        return !storeId.isBlank() && !storePassword.isBlank();
    }

    public boolean isSandbox() { return sandbox; }

    private String host() {
        return sandbox ? "https://sandbox.sslcommerz.com" : "https://securepay.sslcommerz.com";
    }

    /** Start (or restart) a payment for an unpaid online order; returns the gateway page to send the customer to. */
    @Transactional
    public String initiate(Order order) {
        if (!isEnabled()) throw new BadRequestException("Online payment isn't available right now. Please choose Cash on Delivery.");
        if (order.getPaymentMethod() != PaymentMethod.SSLCOMMERZ) throw new BadRequestException("This order is Cash on Delivery.");
        if (order.getPaymentStatus() != PaymentStatus.UNPAID) throw new BadRequestException("This order is already paid.");
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CONFIRMED) {
            throw new BadRequestException("This order can no longer be paid online.");
        }

        // A fresh transaction id per attempt (max 30 chars), so a retry never collides with an earlier session.
        String tranId = order.getOrderNumber() + "-" + Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        order.setPaymentIntentId(tranId);
        orderRepository.save(order);

        Address a = order.getShippingAddress();
        String name = a != null && a.getRecipientName() != null ? a.getRecipientName()
                : (order.getUser().getFirstName() + " " + order.getUser().getLastName()).trim();
        String phone = a != null && a.getPhone() != null ? a.getPhone() : "";
        String street = a != null ? a.getStreet() : "";
        String city = a != null ? a.getCity() : "";
        String postcode = a != null ? a.getZipCode() : "";
        String products = order.getItems().stream().map(i -> i.getProductName()).distinct()
                .collect(Collectors.joining(", "));
        int units = order.getItems().stream().mapToInt(i -> i.getQuantity()).sum();

        Map<String, String> form = new LinkedHashMap<>();
        form.put("store_id", storeId);
        form.put("store_passwd", storePassword);
        form.put("total_amount", money(order.getTotal()));
        form.put("currency", "BDT");
        form.put("tran_id", tranId);
        form.put("success_url", backendUrl + "/api/payments/sslcommerz/success");
        form.put("fail_url", backendUrl + "/api/payments/sslcommerz/fail");
        form.put("cancel_url", backendUrl + "/api/payments/sslcommerz/cancel");
        form.put("ipn_url", backendUrl + "/api/payments/sslcommerz/ipn");
        form.put("cus_name", name);
        form.put("cus_email", order.getUser().getEmail());
        form.put("cus_add1", street);
        form.put("cus_city", city);
        form.put("cus_postcode", postcode);
        form.put("cus_country", "Bangladesh");
        form.put("cus_phone", phone);
        form.put("shipping_method", "YES");
        form.put("num_of_item", String.valueOf(units));
        form.put("ship_name", name);
        form.put("ship_add1", street);
        form.put("ship_area", city);
        form.put("ship_city", city);
        form.put("ship_sub_city", city);
        form.put("ship_postcode", postcode);
        form.put("ship_country", "Bangladesh");
        form.put("product_name", truncate(products.isEmpty() ? "CoreMan order" : products, 250));
        form.put("product_category", "Clothing");
        form.put("product_profile", "physical-goods");
        form.put("value_a", order.getOrderNumber());

        JsonNode res = post(host() + "/gwprocess/v4/api.php", form);
        if (!"SUCCESS".equalsIgnoreCase(res.path("status").asText()) || res.path("GatewayPageURL").asText().isBlank()) {
            log.warn("[PAY] SSLCommerz init failed for {}: {}", order.getOrderNumber(), res.path("failedreason").asText());
            throw new BadRequestException("Couldn't start the online payment. Please try again or choose Cash on Delivery.");
        }
        log.info("[PAY] SSLCommerz session started: order={} tran={}", order.getOrderNumber(), tranId);
        return res.path("GatewayPageURL").asText();
    }

    public enum Outcome { PAID, ALREADY_PAID, FAILED, CANCELLED, INVALID }

    public record Result(Outcome outcome, String orderNumber) {}

    /**
     * Handle a callback (browser redirect or IPN). Only a VALID / VALIDATED answer from the Order Validation API,
     * with matching tran_id, amount and currency, marks the order PAID. Safe to call more than once.
     */
    @Transactional
    public Result handleCallback(Map<String, String> params, String source) {
        String tranId = params.getOrDefault("tran_id", "");
        Optional<Order> found = tranId.isBlank() ? Optional.empty() : orderRepository.findByPaymentIntentId(tranId);
        if (found.isEmpty()) {
            log.warn("[PAY] {} callback for unknown tran_id '{}'", source, tranId);
            return new Result(Outcome.INVALID, null);
        }
        Order order = found.get();
        String status = params.getOrDefault("status", "").toUpperCase();

        if (order.getPaymentStatus() == PaymentStatus.PAID) return new Result(Outcome.ALREADY_PAID, order.getOrderNumber());
        if ("FAILED".equals(status)) return new Result(Outcome.FAILED, order.getOrderNumber());
        if ("CANCELLED".equals(status) || "UNATTEMPTED".equals(status) || "EXPIRED".equals(status)) {
            return new Result(Outcome.CANCELLED, order.getOrderNumber());
        }

        String valId = params.getOrDefault("val_id", "");
        if (valId.isBlank()) return new Result(Outcome.FAILED, order.getOrderNumber());

        JsonNode v = validate(valId);
        String vStatus = v.path("status").asText();
        boolean ok = ("VALID".equals(vStatus) || "VALIDATED".equals(vStatus))
                && tranId.equals(v.path("tran_id").asText())
                && "BDT".equalsIgnoreCase(v.path("currency").asText())
                && sameAmount(v.path("amount").asText(), order.getTotal());
        if (!ok) {
            log.warn("[PAY] Validation rejected: order={} tran={} status={} amount={} currency={}",
                    order.getOrderNumber(), tranId, vStatus, v.path("amount").asText(), v.path("currency").asText());
            return new Result(Outcome.INVALID, order.getOrderNumber());
        }

        order.setPaymentStatus(PaymentStatus.PAID);
        order.setPaymentValId(valId);
        order.setPaymentGatewayRef(v.path("bank_tran_id").asText(null));
        order.setPaymentChannel(v.path("card_type").asText(null));
        order.setPaidAt(LocalDateTime.now());
        if ("1".equals(v.path("risk_level").asText())) {
            String flag = "SSLCommerz flagged this payment as HIGH RISK (" + v.path("risk_title").asText() + "). Verify before shipping.";
            order.setAdminNote(order.getAdminNote() == null ? flag : order.getAdminNote() + "\n" + flag);
        }
        orderRepository.save(order);
        log.info("[PAY] Paid via SSLCommerz ({}): order={} channel={} bankRef={}",
                source, order.getOrderNumber(), order.getPaymentChannel(), order.getPaymentGatewayRef());
        return new Result(Outcome.PAID, order.getOrderNumber());
    }

    private JsonNode validate(String valId) {
        String url = host() + "/validator/api/validationserverAPI.php?val_id=" + enc(valId)
                + "&store_id=" + enc(storeId) + "&store_passwd=" + enc(storePassword) + "&format=json";
        try {
            HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(20)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            return objectMapper.readTree(r.body());
        } catch (Exception e) {
            log.error("[PAY] Validation API call failed: {}", e.getMessage());
            return objectMapper.createObjectNode();
        }
    }

    private JsonNode post(String url, Map<String, String> form) {
        String body = form.entrySet().stream().map(e -> enc(e.getKey()) + "=" + enc(e.getValue() == null ? "" : e.getValue()))
                .collect(Collectors.joining("&"));
        try {
            HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
            return objectMapper.readTree(r.body());
        } catch (Exception e) {
            log.error("[PAY] SSLCommerz request failed: {}", e.getMessage());
            throw new BadRequestException("Couldn't reach the payment gateway. Please try again or choose Cash on Delivery.");
        }
    }

    private static boolean sameAmount(String gateway, BigDecimal ours) {
        try { return new BigDecimal(gateway).setScale(2, RoundingMode.HALF_UP).compareTo(ours.setScale(2, RoundingMode.HALF_UP)) == 0; }
        catch (Exception e) { return false; }
    }

    private static String money(BigDecimal v) { return v.setScale(2, RoundingMode.HALF_UP).toPlainString(); }
    private static String enc(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8); }
    private static String truncate(String s, int max) { return s.length() <= max ? s : s.substring(0, max); }
}
