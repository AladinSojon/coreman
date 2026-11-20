package com.coreman.repository;

import com.coreman.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    // ---- Admin analytics (cancelled orders never count as sales) ----

    @Query("SELECT COUNT(o), COALESCE(SUM(o.total), 0) FROM Order o " +
            "WHERE o.status <> com.coreman.model.enums.OrderStatus.CANCELLED AND o.createdAt >= :from AND o.createdAt < :to")
    List<Object[]> salesBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.paymentStatus = com.coreman.model.enums.PaymentStatus.PAID")
    BigDecimal collectedRevenue();

    @Query("SELECT o.status, COUNT(o) FROM Order o GROUP BY o.status")
    List<Object[]> countByStatus();

    @Query("SELECT o.createdAt, o.total FROM Order o " +
            "WHERE o.status <> com.coreman.model.enums.OrderStatus.CANCELLED AND o.createdAt >= :from")
    List<Object[]> salesSince(@Param("from") LocalDateTime from);

    @Query("SELECT oi.productName, SUM(oi.quantity), SUM(oi.unitPrice * oi.quantity) FROM OrderItem oi " +
            "WHERE oi.order.status <> com.coreman.model.enums.OrderStatus.CANCELLED " +
            "GROUP BY oi.productName ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> topProducts(Pageable pageable);

    @Query("SELECT o.user.id, COUNT(o), COALESCE(SUM(o.total), 0), MAX(o.createdAt) FROM Order o " +
            "WHERE o.user.id IN :userIds AND o.status <> com.coreman.model.enums.OrderStatus.CANCELLED GROUP BY o.user.id")
    List<Object[]> customerStats(@Param("userIds") Collection<Long> userIds);

    @EntityGraph(attributePaths = {"user", "shippingAddress"})
    List<Order> findTop6ByOrderByCreatedAtDesc();

    /** Online orders still unpaid and pending since before the cutoff (abandoned payments). */
    @Query("SELECT o.id FROM Order o WHERE o.paymentMethod = com.coreman.model.enums.PaymentMethod.SSLCOMMERZ " +
            "AND o.paymentStatus = com.coreman.model.enums.PaymentStatus.UNPAID " +
            "AND o.status = com.coreman.model.enums.OrderStatus.PENDING AND o.createdAt < :cutoff")
    List<Long> findAbandonedOnlineOrders(@Param("cutoff") LocalDateTime cutoff);

    /** [productId, unitsSold] for active products, best first, from non-cancelled orders since the date. */
    @Query("SELECT v.product.id, SUM(oi.quantity) FROM OrderItem oi JOIN oi.variant v " +
            "WHERE oi.order.status <> com.coreman.model.enums.OrderStatus.CANCELLED AND oi.order.createdAt >= :since " +
            "AND v.product.isActive = true GROUP BY v.product.id ORDER BY SUM(oi.quantity) DESC")
    List<Object[]> bestSellingProducts(@Param("since") LocalDateTime since, Pageable pageable);

    @EntityGraph(attributePaths = {"shippingAddress"})
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Optional<Order> findByOrderNumber(String orderNumber);

    Optional<Order> findByPaymentIntentId(String paymentIntentId);

    @Override
    @EntityGraph(attributePaths = {"user", "items", "shippingAddress"})
    Page<Order> findAll(Pageable pageable);

    /** True if the user has a delivered order containing any variant of this product. */
    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi WHERE oi.order.user.id = :userId " +
            "AND oi.order.status = com.coreman.model.enums.OrderStatus.DELIVERED " +
            "AND oi.variant.product.id = :productId")
    boolean hasDeliveredPurchase(@Param("userId") Long userId, @Param("productId") Long productId);
}
