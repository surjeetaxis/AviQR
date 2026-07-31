package in.aviqr.support.controller;

import in.aviqr.support.dto.ApiResponse;
import in.aviqr.support.entity.TicketPriority;
import in.aviqr.support.entity.TicketStatus;
import in.aviqr.support.repository.ImpersonationLogRepository;
import in.aviqr.support.repository.TicketRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Unified admin/support analytics: users/sessions (auth-service), tickets/
// impersonation (support-service's own DB), orders/revenue (order-qr-service) —
// one cross-cutting view instead of the fragmented per-service /stats endpoints.
@RestController
@RequestMapping("/api/v1/support/analytics")
@Slf4j
public class AnalyticsController {

    private final TicketRepository ticketRepo;
    private final ImpersonationLogRepository impersonationRepo;
    private final JdbcTemplate authJdbc;
    private final JdbcTemplate orderJdbc;

    // Explicit constructor (not @RequiredArgsConstructor) — Lombok won't reliably
    // copy @Qualifier onto the generated constructor parameter, and there are
    // multiple JdbcTemplate beans in this service (default + auth + order), so
    // disambiguation here must be real. Same reasoning as ReportController.
    public AnalyticsController(TicketRepository ticketRepo,
                                ImpersonationLogRepository impersonationRepo,
                                @Qualifier("authAnalyticsJdbcTemplate") JdbcTemplate authJdbc,
                                @Qualifier("orderAnalyticsJdbcTemplate") JdbcTemplate orderJdbc) {
        this.ticketRepo = ticketRepo;
        this.impersonationRepo = impersonationRepo;
        this.authJdbc = authJdbc;
        this.orderJdbc = orderJdbc;
    }

    private boolean forbidden(String role) {
        return !"ADMIN".equals(role) && !"SUPPORT".equals(role);
    }

    // GET /api/v1/support/analytics/overview — cross-cutting platform snapshot
    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> overview(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (forbidden(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("usersByRole", usersByRole());
        data.put("usersByStatus", usersByStatus());
        data.put("activeSessionsByPlatform", activeSessionsByPlatform());
        data.put("ticketsByStatus", ticketsByStatus());
        data.put("ticketsByPriority", ticketsByPriority());
        data.put("impersonationCount", impersonationRepo.count());
        data.put("platformRevenue", platformRevenue());
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    // GET /api/v1/support/analytics/logins?days=7 — login volume by platform over time
    @GetMapping("/logins")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> logins(
            @RequestParam(defaultValue = "7") int days,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (forbidden(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            List<Map<String, Object>> rows = authJdbc.queryForList(
                "SELECT DATE(created_at) AS day, platform, COUNT(*) AS logins " +
                "FROM refresh_tokens " +
                "WHERE created_at >= NOW() - (? || ' days')::interval " +
                "GROUP BY DATE(created_at), platform ORDER BY day", days);
            return ResponseEntity.ok(ApiResponse.ok(rows));
        } catch (Exception e) {
            log.warn("Login analytics query failed: {}", e.getMessage());
            return ResponseEntity.ok(ApiResponse.ok(List.of()));
        }
    }

    // GET /api/v1/support/analytics/tickets — ticket volume/breakdown
    @GetMapping("/tickets")
    public ResponseEntity<ApiResponse<Map<String, Object>>> tickets(
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (forbidden(role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("byStatus", ticketsByStatus());
        data.put("byPriority", ticketsByPriority());
        data.put("total", ticketRepo.count());
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    private Map<String, Long> usersByRole() {
        Map<String, Long> m = new LinkedHashMap<>();
        try {
            for (Map<String, Object> row : authJdbc.queryForList("SELECT role, COUNT(*) AS c FROM users GROUP BY role"))
                m.put(String.valueOf(row.get("role")).toLowerCase(), ((Number) row.get("c")).longValue());
        } catch (Exception e) { log.warn("usersByRole query failed: {}", e.getMessage()); }
        return m;
    }

    private Map<String, Long> usersByStatus() {
        Map<String, Long> m = new LinkedHashMap<>();
        try {
            for (Map<String, Object> row : authJdbc.queryForList("SELECT status, COUNT(*) AS c FROM users GROUP BY status"))
                m.put(String.valueOf(row.get("status")).toLowerCase(), ((Number) row.get("c")).longValue());
        } catch (Exception e) { log.warn("usersByStatus query failed: {}", e.getMessage()); }
        return m;
    }

    private Map<String, Long> activeSessionsByPlatform() {
        Map<String, Long> m = new LinkedHashMap<>();
        try {
            for (Map<String, Object> row : authJdbc.queryForList(
                    "SELECT platform, COUNT(*) AS c FROM refresh_tokens " +
                    "WHERE revoked = false AND expires_at > NOW() GROUP BY platform"))
                m.put(String.valueOf(row.get("platform")).toLowerCase(), ((Number) row.get("c")).longValue());
        } catch (Exception e) { log.warn("activeSessionsByPlatform query failed: {}", e.getMessage()); }
        return m;
    }

    private Map<String, Long> ticketsByStatus() {
        Map<String, Long> m = new LinkedHashMap<>();
        for (TicketStatus s : TicketStatus.values()) m.put(s.name().toLowerCase(), ticketRepo.countByStatus(s));
        return m;
    }

    private Map<String, Long> ticketsByPriority() {
        Map<String, Long> m = new LinkedHashMap<>();
        for (TicketPriority p : TicketPriority.values()) m.put(p.name().toLowerCase(), ticketRepo.countByPriority(p));
        return m;
    }

    // Same orders table/columns/status-filter as notification-report-review-service's
    // ReportController#platformStats — kept identical rather than re-derived differently.
    private Map<String, Object> platformRevenue() {
        try {
            return orderJdbc.queryForMap("""
                SELECT
                  COUNT(*)                        AS "totalOrders",
                  COALESCE(SUM(total_amount), 0)  AS "totalRevenue"
                FROM orders
                WHERE status NOT IN ('CANCELLED','REJECTED')
                """);
        } catch (Exception e) {
            log.warn("platformRevenue query failed: {}", e.getMessage());
            return Map.of("totalOrders", 0, "totalRevenue", 0);
        }
    }
}
