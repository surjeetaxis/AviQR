package in.aviqr.notification.controller;

import in.aviqr.notification.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * Real SQL analytics from the aviqr_order database.
 * This app connects to the same aviqr_order DB as order-qr-service (read-only), via a
 * second, explicitly-qualified DataSource — the primary spring.datasource here is JPA's,
 * for the Review entity (see ReportDataSourceConfig).
 * All queries use JdbcTemplate (no JPA entities) for flexibility.
 */
@RestController
@RequestMapping("/api/v1/reports")
@Slf4j
public class ReportController {

    private final JdbcTemplate jdbc;

    public ReportController(@Qualifier("reportJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private <T> ResponseEntity<ApiResponse<T>> forbidden() {
        return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
    }

    private boolean canAccessShop(String role, String shopId, String callerShopId) {
        if ("CUSTOMER".equals(role)) return false;
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        return shopId.equals(callerShopId);
    }

    // ── Daily Summary ─────────────────────────────────────────────────────────
    @GetMapping("/shop/{shopId}/daily")
    public ResponseEntity<ApiResponse<Map<String, Object>>> daily(
            @PathVariable String shopId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId)) return forbidden();
        String sql = """
            SELECT
              COALESCE(SUM(total_amount), 0)                                  AS "totalRevenue",
              COUNT(*)                                                          AS "totalOrders",
              COALESCE(AVG(total_amount), 0)                                  AS "avgOrderValue",
              COUNT(DISTINCT customer_phone)
                FILTER (WHERE DATE(created_at) = CURRENT_DATE)                AS "newCustomers",
              COUNT(*) FILTER (WHERE status = 'COMPLETED')                    AS "completedOrders",
              COUNT(*) FILTER (WHERE status = 'CANCELLED')                    AS "cancelledOrders",
              COUNT(*) FILTER (WHERE type = 'DELIVERY')                       AS "deliveryOrders",
              COUNT(*) FILTER (WHERE type = 'TAKEAWAY')                       AS "takeawayOrders",
              COUNT(*) FILTER (WHERE type = 'DINE_IN')                        AS "dineInOrders"
            FROM orders
            WHERE shop_id = ? AND DATE(created_at) = CURRENT_DATE
              AND status NOT IN ('CANCELLED','REJECTED')
            """;
        try {
            Map<String, Object> row = jdbc.queryForMap(sql, shopId);
            // Add top item
            String topItemSql = """
                SELECT oi.item_name, SUM(oi.quantity) AS qty
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.shop_id = ? AND DATE(o.created_at) = CURRENT_DATE
                  AND o.status NOT IN ('CANCELLED','REJECTED')
                GROUP BY oi.item_name ORDER BY qty DESC LIMIT 1
                """;
            try {
                Map<String, Object> top = jdbc.queryForMap(topItemSql, shopId);
                row.put("topItem", top.get("item_name"));
                row.put("topItemQty", top.get("qty"));
            } catch (Exception e) { row.put("topItem", null); }
            row.put("shopId", shopId);
            return ResponseEntity.ok(ApiResponse.ok(row));
        } catch (Exception e) {
            log.warn("Daily stats error for shop {}: {} | root: {}", shopId, e.getMessage(),
                e.getCause() != null ? e.getCause().getMessage() : "none", e);
            // Return zero-filled fallback so dashboard doesn't break
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "totalRevenue", 0, "totalOrders", 0, "avgOrderValue", 0,
                "newCustomers", 0, "completedOrders", 0, "cancelledOrders", 0,
                "deliveryOrders", 0, "takeawayOrders", 0, "dineInOrders", 0
            )));
        }
    }

    // ── Revenue Trend ─────────────────────────────────────────────────────────
    @GetMapping("/shop/{shopId}/revenue")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> revenue(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "7") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
        // Use generate_series to always return `days` rows, filling missing dates with 0
        String sql = ("""
            SELECT
              d.date::date                      AS date,
              COALESCE(SUM(o.total_amount), 0)  AS revenue,
              COUNT(o.id)                        AS orders,
              COALESCE(AVG(o.total_amount), 0)  AS avg_order,
              COUNT(o.id) FILTER (WHERE o.type = 'DELIVERY') AS delivery_count,
              COUNT(o.id) FILTER (WHERE o.type = 'TAKEAWAY') AS takeaway_count,
              COUNT(o.id) FILTER (WHERE o.type = 'DINE_IN')  AS dine_in_count
            FROM generate_series(
                CURRENT_DATE - INTERVAL '%d days',
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS d(date)
            LEFT JOIN orders o
              ON DATE(o.created_at) = d.date::date
             AND o.shop_id = ?
             AND o.status NOT IN ('CANCELLED','REJECTED')
            GROUP BY d.date
            ORDER BY d.date
            """).formatted(days - 1);
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(sql, shopId);
            return ResponseEntity.ok(ApiResponse.ok(rows));
        } catch (Exception e) {
            log.warn("Revenue trend error: {} | root: {}", e.getMessage(),
                e.getCause() != null ? e.getCause().getMessage() : "none");
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── Top Items ─────────────────────────────────────────────────────────────
    @GetMapping("/shop/{shopId}/top-items")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> topItems(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
        String sql = """
            SELECT
              oi.item_name                   AS name,
              SUM(oi.quantity)               AS qty_sold,
              SUM(oi.total_price)            AS revenue,
              AVG(oi.unit_price)             AS avg_price,
              COUNT(DISTINCT o.id)           AS order_count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE o.shop_id = ?
              AND o.created_at >= CURRENT_DATE - INTERVAL '%d days'
              AND o.status NOT IN ('CANCELLED','REJECTED')
            GROUP BY oi.item_name
            ORDER BY revenue DESC
            LIMIT ?
            """.formatted(days);
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(sql, shopId, limit);
            return ResponseEntity.ok(ApiResponse.ok(rows));
        } catch (Exception e) {
            log.warn("Top items error: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── Peak Hours ────────────────────────────────────────────────────────────
    @GetMapping("/shop/{shopId}/peak-hours")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> peakHours(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
        String sql = """
            SELECT
              TO_CHAR(created_at, 'HH12 AM')  AS hour,
              EXTRACT(HOUR FROM created_at)    AS hour_num,
              COUNT(*)                          AS order_count,
              COALESCE(SUM(total_amount), 0)   AS revenue
            FROM orders
            WHERE shop_id = ?
              AND created_at >= CURRENT_DATE - INTERVAL '%d days'
              AND status NOT IN ('CANCELLED','REJECTED')
            GROUP BY hour, hour_num
            ORDER BY hour_num
            """.formatted(days);
        try {
            List<Map<String, Object>> rows = jdbc.queryForList(sql, shopId);
            return ResponseEntity.ok(ApiResponse.ok(rows));
        } catch (Exception e) {
            log.warn("Peak hours error: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── Order History (paginated) ─────────────────────────────────────────────
    @GetMapping("/shop/{shopId}/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> orderHistory(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));

        String dateFrom = startDate != null ? startDate : LocalDate.now().minusDays(30).toString();
        String dateTo   = endDate   != null ? endDate   : LocalDate.now().toString();

        String sql = "SELECT id, order_number, customer_name, customer_phone, table_number,"
            + " type, status, payment_method, payment_status,"
            + " subtotal, tax, total_amount, notes, created_at, completed_at"
            + " FROM orders"
            + " WHERE shop_id = ? AND DATE(created_at) BETWEEN ?::date AND ?::date"
            + (type   != null ? " AND type = '" + type + "'"     : "")
            + (status != null ? " AND status = '" + status + "'" : "")
            + " ORDER BY created_at DESC LIMIT ? OFFSET ?";

        String countSql = "SELECT COUNT(*) FROM orders WHERE shop_id = ?"
            + " AND DATE(created_at) BETWEEN ?::date AND ?::date"
            + (type   != null ? " AND type = '" + type + "'"     : "")
            + (status != null ? " AND status = '" + status + "'" : "");

        try {
            Integer total  = jdbc.queryForObject(countSql, Integer.class, shopId, dateFrom, dateTo);
            if (total == null) total = 0;
            List<Map<String, Object>> rows = jdbc.queryForList(sql, shopId, dateFrom, dateTo, size, page * size);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("content", rows);
            result.put("totalElements", total);
            result.put("totalPages", (int) Math.ceil((double) total / size));
            result.put("page", page);
            result.put("size", size);
            return ResponseEntity.ok(ApiResponse.ok(result));
        } catch (Exception e) {
            log.warn("Order history error: {} | root: {}", e.getMessage(),
                e.getCause() != null ? e.getCause().getMessage() : "none", e);
            return ResponseEntity.ok(ApiResponse.ok(Map.of("content", List.of(), "totalElements", 0, "totalPages", 0, "page", page, "size", size)));
        }
    }

    // ── Order type breakdown ──────────────────────────────────────────────────
    @GetMapping("/shop/{shopId}/order-types")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> orderTypes(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
        String sql = """
            SELECT type,
              COUNT(*)                        AS orders,
              COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
            WHERE shop_id = ?
              AND created_at >= CURRENT_DATE - INTERVAL '%d days'
              AND status NOT IN ('CANCELLED','REJECTED')
            GROUP BY type
            ORDER BY revenue DESC
            """.formatted(days);
        try {
            return ResponseEntity.ok(ApiResponse.ok(jdbc.queryForList(sql, shopId)));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── Aggregator breakdown (Zomato / Swiggy / Direct) ──────────────────────
    @GetMapping("/shop/{shopId}/aggregator-breakdown")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> aggregatorBreakdown(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
        String sql = """
            SELECT
              COALESCE(aggregator_source, 'DIRECT') AS source,
              COUNT(*)                               AS orders,
              COALESCE(SUM(total_amount), 0)        AS revenue
            FROM orders
            WHERE shop_id = ?
              AND created_at >= CURRENT_DATE - INTERVAL '%d days'
              AND status NOT IN ('CANCELLED','REJECTED')
            GROUP BY aggregator_source
            ORDER BY revenue DESC
            """.formatted(days);
        try {
            return ResponseEntity.ok(ApiResponse.ok(jdbc.queryForList(sql, shopId)));
        } catch (Exception e) {
            // aggregator_source column may not exist yet - return empty gracefully
            return ResponseEntity.ok(ApiResponse.ok(List.of(
                Map.of("source", "DIRECT", "orders", 0, "revenue", 0)
            )));
        }
    }

    // ── Platform stats (admin only) ───────────────────────────────────────────
    @GetMapping("/admin/platform")
    public ResponseEntity<ApiResponse<Map<String, Object>>> platformStats(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        String sql = """
            SELECT
              COUNT(DISTINCT shop_id)                                                        AS "activeShops",
              COUNT(*)                                                                        AS "totalOrders",
              COALESCE(SUM(total_amount), 0)                                                 AS "totalRevenue",
              COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)                       AS "todayOrders",
              COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) AS "todayRevenue",
              COALESCE(AVG(total_amount), 0)                                                 AS "avgOrderValue"
            FROM orders
            WHERE status NOT IN ('CANCELLED','REJECTED')
            """;
        try {
            Map<String, Object> row = jdbc.queryForMap(sql);
            return ResponseEntity.ok(ApiResponse.ok(row));
        } catch (Exception e) {
            log.warn("Platform stats error: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "activeShops", 0, "totalOrders", 0, "totalRevenue", 0,
                "todayOrders", 0, "todayRevenue", 0, "avgOrderValue", 0
            )));
        }
    }
}
