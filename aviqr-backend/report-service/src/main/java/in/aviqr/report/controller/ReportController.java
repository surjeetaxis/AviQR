package in.aviqr.report.controller;
import in.aviqr.report.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api/v1/reports") @RequiredArgsConstructor
public class ReportController {
    private final JdbcTemplate jdbc;

    @GetMapping("/shop/{shopId}/daily")
    public ResponseEntity<ApiResponse<Map<String,Object>>> daily(
            @PathVariable String shopId,
            @RequestParam(defaultValue="TODAY") String range) {
        // Aggregates from orders DB — cross-service query via shared DB access or API call
        Map<String,Object> data = new LinkedHashMap<>();
        data.put("shopId", shopId);
        data.put("range", range);
        data.put("totalRevenue", 24680);
        data.put("totalOrders", 73);
        data.put("avgOrderValue", 338);
        data.put("newCustomers", 12);
        data.put("topItem", "Paneer Butter Masala");
        data.put("peakHour", "8 PM");
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @GetMapping("/shop/{shopId}/revenue")
    public ResponseEntity<ApiResponse<List<Map<String,Object>>>> revenue(
            @PathVariable String shopId,
            @RequestParam(defaultValue="7") int days) {
        List<Map<String,Object>> result = new ArrayList<>();
        for (int i = days - 1; i >= 0; i--) {
            Map<String,Object> d = new LinkedHashMap<>();
            d.put("date", LocalDate.now().minusDays(i).toString());
            d.put("revenue", (long)(Math.random() * 30000 + 10000));
            d.put("orders", (int)(Math.random() * 80 + 20));
            result.add(d);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/shop/{shopId}/top-items")
    public ResponseEntity<ApiResponse<List<Map<String,Object>>>> topItems(
            @PathVariable String shopId,
            @RequestParam(defaultValue="10") int limit) {
        // In production: query order_items grouped by menu_item_id
        List<Map<String,Object>> items = List.of(
            Map.of("name","Paneer Butter Masala","qty",168,"revenue",53760),
            Map.of("name","Butter Chicken","qty",152,"revenue",57760),
            Map.of("name","Butter Naan","qty",344,"revenue",18920)
        );
        return ResponseEntity.ok(ApiResponse.ok(items));
    }

    @GetMapping("/shop/{shopId}/peak-hours")
    public ResponseEntity<ApiResponse<List<Map<String,Object>>>> peakHours(@PathVariable String shopId) {
        List<Map<String,Object>> data = new ArrayList<>();
        String[] hours = {"8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM"};
        int[] orders   = {4,7,9,18,34,41,28,14,10,21,38,46,52,37,18};
        for (int i = 0; i < hours.length; i++) {
            data.add(Map.of("hour", hours[i], "orders", orders[i]));
        }
        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    // Paginated daily report snapshots — real persisted rows, not random data.
    @GetMapping("/shop/{shopId}/history")
    public ResponseEntity<ApiResponse<Map<String,Object>>> history(
            @PathVariable String shopId,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestParam(defaultValue="report_date") String sort,
            @RequestParam(defaultValue="desc") String dir) {
        int clampedSize = switch (size) { case 10, 20, 50, 100 -> size; default -> 20; };
        String sortCol = Set.of("report_date", "total_revenue", "total_orders").contains(sort) ? sort : "report_date";
        String sortDir = "asc".equalsIgnoreCase(dir) ? "ASC" : "DESC";

        long total = jdbc.queryForObject(
            "SELECT COUNT(*) FROM report_snapshots WHERE shop_id = ?", Long.class, shopId);

        List<Map<String,Object>> content = jdbc.queryForList(
            "SELECT report_date, total_revenue, total_orders, avg_order_value, new_customers, top_item, peak_hour " +
            "FROM report_snapshots WHERE shop_id = ? ORDER BY " + sortCol + " " + sortDir + " LIMIT ? OFFSET ?",
            shopId, clampedSize, page * clampedSize);

        Map<String,Object> result = new LinkedHashMap<>();
        result.put("content", content);
        result.put("number", page);
        result.put("size", clampedSize);
        result.put("totalElements", total);
        result.put("totalPages", (int) Math.ceil(total / (double) clampedSize));
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/admin/platform")
    public ResponseEntity<ApiResponse<Map<String,Object>>> platformStats() {
        Map<String,Object> data = new LinkedHashMap<>();
        data.put("totalShops", 12487); data.put("activeShops", 11203);
        data.put("totalOrders", 284920); data.put("totalRevenue", 48200000);
        data.put("totalHotels", 284); data.put("totalMalls", 47);
        return ResponseEntity.ok(ApiResponse.ok(data));
    }
}