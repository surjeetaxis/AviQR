package in.aviqr.order.controller;

import in.aviqr.order.dto.ApiResponse;
import in.aviqr.order.dto.BillResponse;
import in.aviqr.order.service.BillService;
import in.aviqr.order.service.InvoiceService;
import in.aviqr.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Consolidated table-bill lifecycle: generate (fold a table's unbilled orders into one bill),
 *  look it up (staff Kanban / customer app), settle it (staff, cash) or sync it (payment-service,
 *  once Razorpay confirms online capture). Mirrors OrderController's role-gating conventions. */
@RestController @RequestMapping("/api/v1/bills") @RequiredArgsConstructor
public class BillController {
    private final BillService service;
    private final OrderService orderService;
    private final InvoiceService invoiceService;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    // Cashier/manager/owner are the billing-capable staff roles (no separate WAITER role
    // exists in this system's UserRole enum — CASHIER covers that function).
    private static final Set<String> STAFF_BILL_ROLES = Set.of("CASHIER", "MANAGER", "OWNER");

    private boolean isShopStaff(String role, String shopId, String callerShopId, String uid) {
        if ("ADMIN".equals(role) || "SUPPORT".equals(role)) return true;
        if ("CUSTOMER".equals(role)) return false;
        if (shopId.equals(callerShopId)) return true;
        return orderService.isShopOwnedBy(shopId, uid);
    }

    private boolean isBillingStaff(String role, String shopId, String callerShopId, String uid) {
        if (!STAFF_BILL_ROLES.contains(role) && !"ADMIN".equals(role)) return false;
        return isShopStaff(role, shopId, callerShopId, uid);
    }

    // Waiter/cashier/owner, or the customer themself when every unbilled order at the table is theirs
    @PostMapping("/shop/{shopId}/table/{tableNumber}/generate")
    public ResponseEntity<ApiResponse<BillResponse>> generate(
            @PathVariable String shopId, @PathVariable String tableNumber,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        boolean staff = isBillingStaff(role, shopId, callerShopId, uid);
        if (!staff && !"CUSTOMER".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Bill generated", service.generate(shopId, tableNumber, uid, staff)));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // Staff Kanban / customer app — the table's currently open (unpaid) bill, if any
    @GetMapping("/shop/{shopId}/table/{tableNumber}/current")
    public ResponseEntity<ApiResponse<BillResponse>> current(
            @PathVariable String shopId, @PathVariable String tableNumber,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        return service.getCurrent(shopId, tableNumber)
            .map(b -> isVisible(b, role, shopId, callerShopId, uid)
                ? ResponseEntity.ok(ApiResponse.ok(b))
                : ResponseEntity.status(403).body(ApiResponse.<BillResponse>error("Forbidden")))
            .orElse(ResponseEntity.notFound().build());
    }

    // Staff Kanban — every OPEN bill for the shop in one call, so the board doesn't need to
    // poll per-table.
    @GetMapping("/shop/{shopId}/open")
    public ResponseEntity<ApiResponse<List<BillResponse>>> open(
            @PathVariable String shopId,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        if (!isShopStaff(role, shopId, callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(service.getOpenBills(shopId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BillResponse>> getById(
            @PathVariable UUID id,
            @RequestHeader(value="X-User-Id", defaultValue="") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        return service.getById(id)
            .map(b -> isVisible(b, role, b.getShopId(), callerShopId, uid)
                ? ResponseEntity.ok(ApiResponse.ok(b))
                : ResponseEntity.status(403).body(ApiResponse.<BillResponse>error("Forbidden")))
            .orElse(ResponseEntity.notFound().build());
    }

    // Staff confirms a cash/manual settlement at the table
    @PostMapping("/{id}/settle")
    public ResponseEntity<ApiResponse<BillResponse>> settle(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        var bill = service.getById(id).orElse(null);
        if (bill == null) return ResponseEntity.notFound().build();
        if (!isBillingStaff(role, bill.getShopId(), callerShopId, uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            return ResponseEntity.ok(ApiResponse.ok("Bill settled", service.settle(id, uid)));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // Internal — payment-service notifies us once Razorpay confirms capture for this bill.
    // Reachable through the public gateway, gated by a shared secret — same pattern as
    // OrderController#paymentSync.
    @PostMapping("/{id}/payment-sync")
    public ResponseEntity<ApiResponse<String>> paymentSync(
            @PathVariable UUID id,
            @RequestHeader(value="X-Internal-Secret", required=false) String secret) {
        if (!internalSyncSecret.isBlank() && !internalSyncSecret.equals(secret))
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid secret"));
        service.syncPaymentCaptured(id);
        return ResponseEntity.ok(ApiResponse.ok("Synced"));
    }

    @GetMapping("/{id}/invoice")
    public ResponseEntity<String> invoiceHtml(@PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(invoiceService.generateBillInvoiceHtml(id));
    }

    @GetMapping("/{id}/invoice/pdf")
    public ResponseEntity<byte[]> invoicePdf(@PathVariable UUID id) {
        byte[] pdf = invoiceService.generateBillInvoicePdf(id);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Bill-" + id + ".pdf\"")
            .body(pdf);
    }

    private boolean isVisible(BillResponse b, String role, String shopId, String callerShopId, String uid) {
        if (isShopStaff(role, shopId, callerShopId, uid)) return true;
        return b.getOrders().stream().anyMatch(o -> uid.equals(o.getCustomerId()));
    }
}
