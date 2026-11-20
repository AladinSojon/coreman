package com.coreman.service;

import com.coreman.exception.BadRequestException;
import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Order;
import com.coreman.model.OrderItem;
import com.coreman.model.ProductVariant;
import com.coreman.model.enums.OrderStatus;
import com.coreman.model.enums.PaymentMethod;
import com.coreman.model.enums.PaymentStatus;
import com.coreman.repository.OrderRepository;
import com.coreman.repository.ProductVariantRepository;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private final OrderRepository orderRepository;
    private final ProductVariantRepository variantRepository;

    /** q matches order number, customer email/name, recipient name or phone. */
    @Transactional(readOnly = true)
    public Page<Order> search(String q, String status, String payment, int page, int size) {
        return orderRepository.findAll(spec(q, status, payment),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @Transactional(readOnly = true)
    public List<Order> searchAll(String q, String status, String payment) {
        return orderRepository.findAll(spec(q, status, payment), Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private Specification<Order> spec(String q, String status, String payment) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null && !status.isBlank()) p.add(cb.equal(root.get("status"), parseStatus(status)));
            if (payment != null && !payment.isBlank()) p.add(cb.equal(root.get("paymentStatus"), parsePayment(payment)));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                var user = root.join("user", JoinType.LEFT);
                var addr = root.join("shippingAddress", JoinType.LEFT);
                p.add(cb.or(
                        cb.like(cb.lower(root.get("orderNumber")), like),
                        cb.like(cb.lower(user.get("email")), like),
                        cb.like(cb.lower(cb.concat(cb.concat(user.get("firstName"), " "), user.get("lastName"))), like),
                        cb.like(cb.lower(addr.get("recipientName")), like),
                        cb.like(addr.get("phone"), "%" + q.trim().replaceAll("[\\s-]", "") + "%")));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
    }

    /**
     * Change status. Cancelling puts the stock back; a cancelled order is final (place a new order instead),
     * so stock can't be double-counted. COD orders become PAID when delivered.
     */
    @Transactional
    public Order updateStatus(Long id, String rawStatus) {
        Order order = find(id);
        OrderStatus next = parseStatus(rawStatus);
        OrderStatus current = order.getStatus();
        if (next == current) return order;
        if (current == OrderStatus.CANCELLED) {
            throw new BadRequestException("Cancelled orders can't be reopened — stock has already been returned.");
        }

        if (next == OrderStatus.CANCELLED) {
            for (OrderItem item : order.getItems()) {
                ProductVariant v = item.getVariant();
                if (v != null) {
                    v.setStockQuantity(v.getStockQuantity() + item.getQuantity());
                    variantRepository.save(v);
                }
            }
            if (order.getPaymentStatus() == PaymentStatus.PAID) order.setPaymentStatus(PaymentStatus.REFUNDED);
        }
        if (next == OrderStatus.DELIVERED
                && (order.getPaymentMethod() == null || order.getPaymentMethod() == PaymentMethod.COD)
                && order.getPaymentStatus() == PaymentStatus.UNPAID) {
            order.setPaymentStatus(PaymentStatus.PAID);
        }
        order.setStatus(next);
        log.info("[ADMIN] Order {} status {} -> {}", order.getOrderNumber(), current, next);
        return orderRepository.save(order);
    }

    @Transactional
    public Order updatePayment(Long id, String rawPayment) {
        Order order = find(id);
        order.setPaymentStatus(parsePayment(rawPayment));
        log.info("[ADMIN] Order {} payment -> {}", order.getOrderNumber(), order.getPaymentStatus());
        return orderRepository.save(order);
    }

    @Transactional
    public Order updateNote(Long id, String note) {
        Order order = find(id);
        order.setAdminNote(note == null || note.isBlank() ? null : note.trim());
        return orderRepository.save(order);
    }

    @Transactional(readOnly = true)
    public Order get(Long id) { return find(id); }

    /** CSV with one row per order; values quoted, formulas neutralised for spreadsheet safety. */
    @Transactional(readOnly = true)
    public String exportCsv(String q, String status, String payment) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        StringBuilder sb = new StringBuilder("﻿"); // BOM so Excel reads UTF-8 (৳, Bangla names)
        sb.append("Order,Date,Status,Payment method,Payment status,Customer,Email,Recipient,Phone,Address,City,Postcode,Items,Subtotal,Shipping,Total,Note\n");
        for (Order o : searchAll(q, status, payment)) {
            var a = o.getShippingAddress();
            String items = o.getItems().stream()
                    .map(i -> i.getQuantity() + "x " + i.getProductName() + " (" + i.getSize() + "/" + i.getColor() + ")")
                    .reduce((x, y) -> x + "; " + y).orElse("");
            List<Object> cols = List.of(
                    o.getOrderNumber(), o.getCreatedAt() != null ? o.getCreatedAt().format(fmt) : "",
                    o.getStatus(), o.getPaymentMethod() != null ? o.getPaymentMethod() : PaymentMethod.COD, o.getPaymentStatus(),
                    o.getUser().getFirstName() + " " + o.getUser().getLastName(),
                    Boolean.TRUE.equals(o.getUser().getGuest()) ? "(guest checkout)" : o.getUser().getEmail(),
                    a != null && a.getRecipientName() != null ? a.getRecipientName() : "",
                    a != null && a.getPhone() != null ? a.getPhone() : "",
                    a != null ? a.getStreet() : "", a != null ? a.getCity() : "", a != null ? a.getZipCode() : "",
                    items, o.getSubtotal(), o.getShippingCost(), o.getTotal(),
                    o.getAdminNote() != null ? o.getAdminNote() : "");
            sb.append(String.join(",", cols.stream().map(AdminOrderService::csv).toList())).append('\n');
        }
        return sb.toString();
    }

    private static String csv(Object value) {
        String s = value == null ? "" : value.toString();
        if (!s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0 && !s.matches("-?\\d+(\\.\\d+)?")) s = "'" + s;
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }

    private Order find(Long id) {
        return orderRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    private static OrderStatus parseStatus(String s) {
        try { return OrderStatus.valueOf(s.trim().toUpperCase(Locale.ROOT)); }
        catch (Exception e) { throw new BadRequestException("Unknown order status: " + s); }
    }

    private static PaymentStatus parsePayment(String s) {
        try { return PaymentStatus.valueOf(s.trim().toUpperCase(Locale.ROOT)); }
        catch (Exception e) { throw new BadRequestException("Unknown payment status: " + s); }
    }
}
