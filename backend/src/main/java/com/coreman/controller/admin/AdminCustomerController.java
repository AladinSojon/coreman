package com.coreman.controller.admin;

import com.coreman.exception.ResourceNotFoundException;
import com.coreman.model.Order;
import com.coreman.model.User;
import com.coreman.repository.AddressRepository;
import com.coreman.repository.OrderRepository;
import com.coreman.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/admin/customers")
@RequiredArgsConstructor
public class AdminCustomerController {

    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final AddressRepository addressRepository;
    private final com.coreman.service.PasswordResetService passwordResetService;

    public record CustomerRow(Long id, String name, String email, String phone, String role,
                              LocalDateTime joinedAt, long orders, BigDecimal totalSpent, LocalDateTime lastOrderAt) {}

    public record OrderSummary(Long id, String orderNumber, String status, String paymentStatus,
                               BigDecimal total, int items, LocalDateTime createdAt) {}

    public record CustomerDetail(CustomerRow customer, List<OrderSummary> orders, List<?> addresses) {}

    /** ?q=name/email/phone&page=0&size=20 — newest first. Spend excludes cancelled orders. */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<CustomerRow>> list(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Specification<User> spec = (root, query, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            List<Predicate> any = List.of(
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(cb.concat(cb.concat(root.get("firstName"), " "), root.get("lastName"))), like),
                    cb.like(cb.coalesce(root.get("phone"), ""), like));
            return cb.or(any.toArray(Predicate[]::new));
        };
        Page<User> users = userRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt")));

        Map<Long, Object[]> stats = new HashMap<>();
        if (!users.isEmpty()) {
            for (Object[] row : orderRepository.customerStats(users.map(User::getId).toList())) stats.put((Long) row[0], row);
        }
        List<CustomerRow> rows = users.getContent().stream().map(u -> row(u, stats.get(u.getId()))).toList();
        return ResponseEntity.ok(new PageImpl<>(rows, users.getPageable(), users.getTotalElements()));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<CustomerDetail> get(@PathVariable Long id) {
        User u = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
        List<Object[]> s = orderRepository.customerStats(List.of(id));
        List<OrderSummary> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(id).stream()
                .map(o -> new OrderSummary(o.getId(), o.getOrderNumber(), o.getStatus().name(), o.getPaymentStatus().name(),
                        o.getTotal(), o.getItems().stream().mapToInt(i -> i.getQuantity()).sum(), o.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(new CustomerDetail(row(u, s.isEmpty() ? null : s.get(0)), orders,
                addressRepository.findByUserIdOrderByIsDefaultDesc(id)));
    }

    /** One-time reset link secret (24 h) for the admin to send the customer, e.g. on WhatsApp. */
    @PostMapping("/{id}/reset-link")
    public ResponseEntity<Map<String, Object>> resetLink(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("token", passwordResetService.createForAdmin(id), "expiresInHours", 24));
    }

    private static CustomerRow row(User u, Object[] s) {
        boolean guest = Boolean.TRUE.equals(u.getGuest());
        return new CustomerRow(u.getId(), (u.getFirstName() + " " + u.getLastName()).trim(), guest ? null : u.getEmail(), u.getPhone(),
                guest ? "GUEST" : u.getRole().name(), u.getCreatedAt(),
                s == null ? 0 : ((Number) s[1]).longValue(),
                s == null ? BigDecimal.ZERO : (BigDecimal) s[2],
                s == null ? null : (LocalDateTime) s[3]);
    }
}
