package com.coreman.service;

import com.coreman.model.Order;
import com.coreman.model.ProductVariant;
import com.coreman.model.enums.OrderStatus;
import com.coreman.model.enums.Role;
import com.coreman.repository.OrderRepository;
import com.coreman.repository.ProductRepository;
import com.coreman.repository.ProductVariantRepository;
import com.coreman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/** Numbers for the admin dashboard. Cancelled orders are excluded from every sales figure. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

    public static final int LOW_STOCK_THRESHOLD = 5;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final UserRepository userRepository;

    public record Period(long orders, BigDecimal revenue) {}
    public record DayPoint(LocalDate date, long orders, BigDecimal revenue) {}
    public record TopProduct(String name, long units, BigDecimal revenue) {}
    public record LowStockItem(Long productId, String productName, String slug, String size, String color, int stock) {}
    public record RecentOrder(Long id, String orderNumber, String customer, BigDecimal total, String status, LocalDateTime createdAt) {}

    public record Dashboard(
            Period today, Period thisMonth, Period lastMonth, Period allTime,
            BigDecimal collectedRevenue, BigDecimal averageOrderValue,
            Map<String, Long> ordersByStatus,
            List<DayPoint> last30Days,
            List<TopProduct> topProducts,
            List<LowStockItem> lowStock, long lowStockCount, int lowStockThreshold,
            List<RecentOrder> recentOrders,
            long customers, long newCustomers30d,
            long activeProducts, long totalProducts
    ) {}

    public Dashboard dashboard() {
        LocalDate todayDate = LocalDate.now();
        LocalDateTime startOfToday = todayDate.atStartOfDay();
        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        LocalDateTime startOfLastMonth = YearMonth.now().minusMonths(1).atDay(1).atStartOfDay();
        LocalDateTime farFuture = LocalDateTime.now().plusYears(100);

        Period today = period(startOfToday, farFuture);
        Period thisMonth = period(startOfMonth, farFuture);
        Period lastMonth = period(startOfLastMonth, startOfMonth);
        Period allTime = period(LocalDateTime.of(2000, 1, 1, 0, 0), farFuture);

        BigDecimal aov = allTime.orders() == 0 ? BigDecimal.ZERO
                : allTime.revenue().divide(BigDecimal.valueOf(allTime.orders()), 2, RoundingMode.HALF_UP);

        // Every status present, even with 0, in workflow order.
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) byStatus.put(s.name(), 0L);
        for (Object[] row : orderRepository.countByStatus()) byStatus.put(((OrderStatus) row[0]).name(), (Long) row[1]);

        // Daily series for the last 30 days (including today), zero-filled.
        LocalDate firstDay = todayDate.minusDays(29);
        Map<LocalDate, long[]> counts = new TreeMap<>();
        Map<LocalDate, BigDecimal> sums = new HashMap<>();
        for (int i = 0; i < 30; i++) { counts.put(firstDay.plusDays(i), new long[]{0}); sums.put(firstDay.plusDays(i), BigDecimal.ZERO); }
        for (Object[] row : orderRepository.salesSince(firstDay.atStartOfDay())) {
            LocalDate d = ((LocalDateTime) row[0]).toLocalDate();
            if (!counts.containsKey(d)) continue;
            counts.get(d)[0]++;
            sums.merge(d, (BigDecimal) row[1], BigDecimal::add);
        }
        List<DayPoint> series = counts.keySet().stream()
                .map(d -> new DayPoint(d, counts.get(d)[0], sums.get(d))).toList();

        List<TopProduct> top = orderRepository.topProducts(PageRequest.of(0, 5)).stream()
                .map(r -> new TopProduct((String) r[0], ((Number) r[1]).longValue(), (BigDecimal) r[2])).toList();

        List<LowStockItem> low = variantRepository.findLowStock(LOW_STOCK_THRESHOLD, PageRequest.of(0, 8)).stream()
                .map(this::lowStockItem).toList();

        List<RecentOrder> recent = orderRepository.findTop6ByOrderByCreatedAtDesc().stream()
                .map(this::recentOrder).toList();

        return new Dashboard(today, thisMonth, lastMonth, allTime,
                orderRepository.collectedRevenue(), aov, byStatus, series, top,
                low, variantRepository.countLowStock(LOW_STOCK_THRESHOLD), LOW_STOCK_THRESHOLD, recent,
                userRepository.countByRole(Role.CUSTOMER),
                userRepository.countByRoleAndCreatedAtAfter(Role.CUSTOMER, LocalDateTime.now().minusDays(30)),
                productRepository.countByIsActiveTrue(), productRepository.count());
    }

    private Period period(LocalDateTime from, LocalDateTime to) {
        List<Object[]> rows = orderRepository.salesBetween(from, to);
        Object[] r = rows.isEmpty() ? new Object[]{0L, BigDecimal.ZERO} : rows.get(0);
        return new Period(((Number) r[0]).longValue(), (BigDecimal) r[1]);
    }

    private LowStockItem lowStockItem(ProductVariant v) {
        return new LowStockItem(v.getProduct().getId(), v.getProduct().getName(), v.getProduct().getSlug(),
                v.getSize(), v.getColor(), v.getStockQuantity());
    }

    private RecentOrder recentOrder(Order o) {
        String name = o.getShippingAddress() != null && o.getShippingAddress().getRecipientName() != null
                ? o.getShippingAddress().getRecipientName()
                : (o.getUser().getFirstName() + " " + o.getUser().getLastName()).trim();
        return new RecentOrder(o.getId(), o.getOrderNumber(), name, o.getTotal(), o.getStatus().name(), o.getCreatedAt());
    }
}
