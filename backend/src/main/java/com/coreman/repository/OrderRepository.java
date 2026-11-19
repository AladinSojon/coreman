package com.coreman.repository;

import com.coreman.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

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
