package com.coreman.service;

import com.coreman.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Cancels online-payment orders that were never paid, so their stock goes back on sale.
 * Runs every 10 minutes; the window is coreman.payments.unpaid-timeout-minutes (default 60).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentExpiryJob {

    private final OrderRepository orderRepository;
    private final AdminOrderService adminOrderService;

    @Value("${coreman.payments.unpaid-timeout-minutes:60}")
    private long timeoutMinutes;

    @Scheduled(fixedDelay = 10 * 60 * 1000L, initialDelay = 60 * 1000L)
    public void cancelAbandoned() {
        for (Long id : orderRepository.findAbandonedOnlineOrders(LocalDateTime.now().minusMinutes(timeoutMinutes))) {
            try {
                adminOrderService.updateStatus(id, "CANCELLED");
                adminOrderService.updateNote(id, "Auto-cancelled: online payment not completed within " + timeoutMinutes + " minutes.");
                log.info("[PAY] Auto-cancelled unpaid online order id={}", id);
            } catch (Exception e) {
                log.warn("[PAY] Could not auto-cancel order id={}: {}", id, e.getMessage());
            }
        }
    }
}
