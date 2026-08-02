package in.aviqr.notification.controller;

import in.aviqr.notification.dto.ApiResponse;
import in.aviqr.notification.service.ElasticEmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
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
    private final ElasticEmailService emailService;

    public ReportController(@Qualifier("reportJdbcTemplate") JdbcTemplate jdbc, ElasticEmailService emailService) {
        this.jdbc = jdbc;
        this.emailService = emailService;
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
              ROUND(COALESCE(AVG(total_amount), 0), 2)                        AS "avgOrderValue",
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
              ROUND(COALESCE(AVG(o.total_amount), 0), 2) AS avg_order,
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

        // Built with ? placeholders throughout — type/status were previously concatenated
        // directly into the query string, which was a SQL injection hole.
        StringBuilder sql = new StringBuilder(
            "SELECT id, order_number, customer_name, customer_phone, table_number,"
            + " type, status, payment_method, payment_status,"
            + " subtotal, tax, total_amount, notes, created_at, completed_at"
            + " FROM orders"
            + " WHERE shop_id = ? AND DATE(created_at) BETWEEN ?::date AND ?::date");
        StringBuilder countSql = new StringBuilder(
            "SELECT COUNT(*) FROM orders WHERE shop_id = ? AND DATE(created_at) BETWEEN ?::date AND ?::date");
        List<Object> params = new ArrayList<>(List.of(shopId, dateFrom, dateTo));
        if (type != null)   { sql.append(" AND type = ?");   countSql.append(" AND type = ?");   params.add(type); }
        if (status != null) { sql.append(" AND status = ?"); countSql.append(" AND status = ?"); params.add(status); }
        Object[] countParams = params.toArray();
        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(size); params.add(page * size);

        try {
            Integer total  = jdbc.queryForObject(countSql.toString(), Integer.class, countParams);
            if (total == null) total = 0;
            List<Map<String, Object>> rows = jdbc.queryForList(sql.toString(), params.toArray());
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

    // ── Tax report ────────────────────────────────────────────────────────────
    // CGST/SGST split follows the same convention InvoiceService already uses for
    // per-order invoices: tax/2 each (5% + 5% = the combined `tax` amount already
    // stored on the order — no separate rate columns exist to derive this from).
    @GetMapping("/shop/{shopId}/tax")
    public ResponseEntity<ApiResponse<Map<String, Object>>> taxReport(
            @PathVariable String shopId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId))
            return ResponseEntity.status(403).body(new ApiResponse<>(false, "Forbidden", null));
        return ResponseEntity.ok(ApiResponse.ok(buildTaxReport(shopId, startDate, endDate)));
    }

    @GetMapping("/shop/{shopId}/tax/export")
    public ResponseEntity<byte[]> exportTaxReport(
            @PathVariable String shopId,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId)) return ResponseEntity.status(403).build();
        Map<String, Object> report = buildTaxReport(shopId, startDate, endDate);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) report.get("rows");
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) report.get("totals");

        StringBuilder csv = new StringBuilder("Date,Orders,Subtotal,CGST,SGST,Total Tax,Total Amount\n");
        for (Map<String, Object> row : rows) {
            csv.append(row.get("date")).append(',')
               .append(row.get("orders")).append(',')
               .append(row.get("subtotal")).append(',')
               .append(row.get("cgst")).append(',')
               .append(row.get("sgst")).append(',')
               .append(row.get("tax")).append(',')
               .append(row.get("totalAmount")).append('\n');
        }
        csv.append("TOTAL,").append(totals.get("orders")).append(',')
           .append(totals.get("subtotal")).append(',')
           .append(totals.get("cgst")).append(',')
           .append(totals.get("sgst")).append(',')
           .append(totals.get("tax")).append(',')
           .append(totals.get("totalAmount")).append('\n');

        byte[] body = csv.toString().getBytes(StandardCharsets.UTF_8);
        String from = startDate != null ? startDate : LocalDate.now().minusDays(30).toString();
        String to   = endDate   != null ? endDate   : LocalDate.now().toString();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(org.springframework.http.ContentDisposition
            .attachment().filename("tax-report-" + shopId + "-" + from + "_" + to + ".csv").build());
        return ResponseEntity.ok().headers(headers).body(body);
    }

    private Map<String, Object> buildTaxReport(String shopId, String startDate, String endDate) {
        String dateFrom = startDate != null ? startDate : LocalDate.now().minusDays(30).toString();
        String dateTo   = endDate   != null ? endDate   : LocalDate.now().toString();
        String sql = """
            SELECT
              DATE(created_at)                  AS date,
              COUNT(*)                          AS orders,
              COALESCE(SUM(subtotal), 0)        AS subtotal,
              COALESCE(SUM(tax), 0)             AS tax,
              COALESCE(SUM(total_amount), 0)    AS total_amount
            FROM orders
            WHERE shop_id = ? AND DATE(created_at) BETWEEN ?::date AND ?::date
              AND status NOT IN ('CANCELLED','REJECTED')
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
            """;
        List<Map<String, Object>> rawRows;
        try {
            rawRows = jdbc.queryForList(sql, shopId, dateFrom, dateTo);
        } catch (Exception e) {
            log.warn("Tax report error for shop {}: {}", shopId, e.getMessage());
            rawRows = List.of();
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        BigDecimal totalSubtotal = BigDecimal.ZERO, totalTax = BigDecimal.ZERO, totalAmount = BigDecimal.ZERO;
        long totalOrders = 0;
        for (Map<String, Object> raw : rawRows) {
            BigDecimal subtotal = toBigDecimal(raw.get("subtotal"));
            BigDecimal tax      = toBigDecimal(raw.get("tax"));
            BigDecimal amount   = toBigDecimal(raw.get("total_amount"));
            BigDecimal cgst = tax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            BigDecimal sgst = tax.subtract(cgst);
            long orders = ((Number) raw.get("orders")).longValue();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", raw.get("date"));
            row.put("orders", orders);
            row.put("subtotal", subtotal);
            row.put("cgst", cgst);
            row.put("sgst", sgst);
            row.put("tax", tax);
            row.put("totalAmount", amount);
            rows.add(row);

            totalSubtotal = totalSubtotal.add(subtotal);
            totalTax = totalTax.add(tax);
            totalAmount = totalAmount.add(amount);
            totalOrders += orders;
        }
        BigDecimal totalCgst = totalTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal totalSgst = totalTax.subtract(totalCgst);

        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("orders", totalOrders);
        totals.put("subtotal", totalSubtotal);
        totals.put("cgst", totalCgst);
        totals.put("sgst", totalSgst);
        totals.put("tax", totalTax);
        totals.put("totalAmount", totalAmount);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("rows", rows);
        result.put("totals", totals);
        return result;
    }

    private BigDecimal toBigDecimal(Object v) {
        if (v == null) return BigDecimal.ZERO;
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(v.toString()); } catch (Exception e) { return BigDecimal.ZERO; }
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
              ROUND(COALESCE(AVG(total_amount), 0), 2)                                       AS "avgOrderValue"
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

    // ── Platform revenue trend (admin only) ───────────────────────────────────
    @GetMapping("/admin/platform/revenue-trend")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> platformRevenueTrend(
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) return forbidden();
        try {
            return ResponseEntity.ok(ApiResponse.ok(fetchPlatformRevenueTrend(days)));
        } catch (Exception e) {
            log.warn("Platform revenue trend error: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── Platform order-type breakdown (admin only) ────────────────────────────
    @GetMapping("/admin/platform/order-types")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> platformOrderTypes(
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) return forbidden();
        try {
            return ResponseEntity.ok(ApiResponse.ok(fetchPlatformOrderTypes(days)));
        } catch (Exception e) {
            log.warn("Platform order-types error: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── Top shops by revenue (admin only) ─────────────────────────────────────
    @GetMapping("/admin/platform/top-shops")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> platformTopShops(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "10") int limit,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) return forbidden();
        try {
            return ResponseEntity.ok(ApiResponse.ok(fetchPlatformTopShops(days, limit)));
        } catch (Exception e) {
            log.warn("Platform top-shops error: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // ── CSV export of the platform report (admin only) ────────────────────────
    @GetMapping("/admin/platform/export")
    public ResponseEntity<byte[]> exportPlatformReport(
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) return ResponseEntity.status(403).build();
        byte[] body = buildPlatformReportCsv(days).getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv"));
        headers.setContentDisposition(org.springframework.http.ContentDisposition
            .attachment().filename("platform-report-" + LocalDate.now() + ".csv").build());
        return ResponseEntity.ok().headers(headers).body(body);
    }

    // ── Email the platform report to an admin-chosen recipient ───────────────
    @PostMapping("/admin/platform/email")
    public ResponseEntity<ApiResponse<Void>> emailPlatformReport(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) return forbidden();
        String to = body.get("to") != null ? body.get("to").toString().trim() : "";
        if (to.isEmpty() || !to.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            return ResponseEntity.badRequest().body(ApiResponse.error("A valid recipient email is required"));
        int days = body.get("days") != null ? Integer.parseInt(body.get("days").toString()) : 30;
        emailService.send(to, "AviQR Platform Report — " + LocalDate.now(), buildPlatformReportHtml(days));
        return ResponseEntity.ok(ApiResponse.ok("Report emailed to " + to, null));
    }

    private List<Map<String, Object>> fetchPlatformRevenueTrend(int days) {
        String sql = ("""
            SELECT
              d.date::date                      AS date,
              COALESCE(SUM(o.total_amount), 0)  AS revenue,
              COUNT(o.id)                        AS orders
            FROM generate_series(
                CURRENT_DATE - INTERVAL '%d days',
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS d(date)
            LEFT JOIN orders o
              ON DATE(o.created_at) = d.date::date
             AND o.status NOT IN ('CANCELLED','REJECTED')
            GROUP BY d.date
            ORDER BY d.date
            """).formatted(days - 1);
        return jdbc.queryForList(sql);
    }

    private List<Map<String, Object>> fetchPlatformOrderTypes(int days) {
        String sql = """
            SELECT type,
              COUNT(*)                        AS orders,
              COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '%d days'
              AND status NOT IN ('CANCELLED','REJECTED')
            GROUP BY type
            ORDER BY revenue DESC
            """.formatted(days);
        return jdbc.queryForList(sql);
    }

    private List<Map<String, Object>> fetchPlatformTopShops(int days, int limit) {
        String sql = """
            SELECT shop_id                          AS "shopId",
              COUNT(*)                               AS orders,
              COALESCE(SUM(total_amount), 0)        AS revenue
            FROM orders
            WHERE created_at >= CURRENT_DATE - INTERVAL '%d days'
              AND status NOT IN ('CANCELLED','REJECTED')
            GROUP BY shop_id
            ORDER BY revenue DESC
            LIMIT ?
            """.formatted(days);
        return jdbc.queryForList(sql, limit);
    }

    private String buildPlatformReportCsv(int days) {
        Map<String, Object> summary = jdbc.queryForMap("""
            SELECT
              COUNT(DISTINCT shop_id)                                                        AS "activeShops",
              COUNT(*)                                                                        AS "totalOrders",
              COALESCE(SUM(total_amount), 0)                                                 AS "totalRevenue",
              ROUND(COALESCE(AVG(total_amount), 0), 2)                                       AS "avgOrderValue"
            FROM orders
            WHERE status NOT IN ('CANCELLED','REJECTED') AND created_at >= CURRENT_DATE - INTERVAL '%d days'
            """.formatted(days));

        StringBuilder csv = new StringBuilder();
        csv.append("AviQR Platform Report — last ").append(days).append(" days\n\n");
        csv.append("Active shops,Total orders,Total revenue,Avg order value\n");
        csv.append(summary.get("activeShops")).append(',')
           .append(summary.get("totalOrders")).append(',')
           .append(summary.get("totalRevenue")).append(',')
           .append(summary.get("avgOrderValue")).append('\n');

        csv.append("\nDate,Orders,Revenue\n");
        for (Map<String, Object> row : fetchPlatformRevenueTrend(days)) {
            csv.append(row.get("date")).append(',').append(row.get("orders")).append(',').append(row.get("revenue")).append('\n');
        }

        csv.append("\nOrder type,Orders,Revenue\n");
        for (Map<String, Object> row : fetchPlatformOrderTypes(days)) {
            csv.append(row.get("type")).append(',').append(row.get("orders")).append(',').append(row.get("revenue")).append('\n');
        }

        csv.append("\nShop ID,Orders,Revenue\n");
        for (Map<String, Object> row : fetchPlatformTopShops(days, 10)) {
            csv.append(row.get("shopId")).append(',').append(row.get("orders")).append(',').append(row.get("revenue")).append('\n');
        }
        return csv.toString();
    }

    private String buildPlatformReportHtml(int days) {
        Map<String, Object> summary = jdbc.queryForMap("""
            SELECT
              COUNT(DISTINCT shop_id)                                                        AS "activeShops",
              COUNT(*)                                                                        AS "totalOrders",
              COALESCE(SUM(total_amount), 0)                                                 AS "totalRevenue",
              ROUND(COALESCE(AVG(total_amount), 0), 2)                                       AS "avgOrderValue"
            FROM orders
            WHERE status NOT IN ('CANCELLED','REJECTED') AND created_at >= CURRENT_DATE - INTERVAL '%d days'
            """.formatted(days));

        StringBuilder rows = new StringBuilder();
        for (Map<String, Object> r : fetchPlatformOrderTypes(days)) {
            rows.append("<tr><td>").append(r.get("type")).append("</td><td>").append(r.get("orders"))
                .append("</td><td>₹").append(r.get("revenue")).append("</td></tr>");
        }

        return """
            <div style="font-family:Arial,sans-serif;max-width:600px">
              <h2>AviQR Platform Report</h2>
              <p>Last %d days, generated %s</p>
              <table style="border-collapse:collapse;width:100%%;margin-bottom:16px">
                <tr><td style="padding:6px 12px;border:1px solid #ddd">Active shops</td><td style="padding:6px 12px;border:1px solid #ddd">%s</td></tr>
                <tr><td style="padding:6px 12px;border:1px solid #ddd">Total orders</td><td style="padding:6px 12px;border:1px solid #ddd">%s</td></tr>
                <tr><td style="padding:6px 12px;border:1px solid #ddd">Total revenue</td><td style="padding:6px 12px;border:1px solid #ddd">₹%s</td></tr>
                <tr><td style="padding:6px 12px;border:1px solid #ddd">Avg order value</td><td style="padding:6px 12px;border:1px solid #ddd">₹%s</td></tr>
              </table>
              <h3>Order types</h3>
              <table style="border-collapse:collapse;width:100%%">
                <tr><th style="padding:6px 12px;border:1px solid #ddd;text-align:left">Type</th><th style="padding:6px 12px;border:1px solid #ddd;text-align:left">Orders</th><th style="padding:6px 12px;border:1px solid #ddd;text-align:left">Revenue</th></tr>
                %s
              </table>
            </div>
            """.formatted(days, LocalDate.now(), summary.get("activeShops"), summary.get("totalOrders"),
                summary.get("totalRevenue"), summary.get("avgOrderValue"), rows);
    }
}
