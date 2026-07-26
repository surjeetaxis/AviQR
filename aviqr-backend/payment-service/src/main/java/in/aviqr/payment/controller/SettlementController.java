package in.aviqr.payment.controller;

import in.aviqr.payment.dto.ApiResponse;
import in.aviqr.payment.entity.Payment;
import in.aviqr.payment.entity.Settlement;
import in.aviqr.payment.repository.PaymentRepository;
import in.aviqr.payment.repository.SettlementRepository;
import in.aviqr.payment.service.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Settlement batches double as the nightly auto-settlement audit report — every run
 *  (including skipped/failed ones) is listed here, drillable down to the individual
 *  payments folded into a given batch.
 *
 *  Settlement data is payout/financial information, not general order data, so access is
 *  deliberately narrower than e.g. PaymentController's shop-payments listing: platform
 *  ADMIN/SUPPORT, or shop OWNER/MANAGER for their own shop. Other shop-scoped roles
 *  (CASHIER, KITCHEN, MENU_EDITOR, ORDER_VIEWER) and non-staff roles (CUSTOMER, SUPPLIER,
 *  HOTEL, MALL) are excluded even when their JWT carries a matching X-Shop-Id. */
@RestController @RequestMapping("/api/v1/settlements") @RequiredArgsConstructor
public class SettlementController {

    private static final Set<String> SHOP_FINANCE_ROLES = Set.of("OWNER", "MANAGER");
    private static final Set<String> PLATFORM_ROLES = Set.of("ADMIN", "SUPPORT");

    private final SettlementRepository settlementRepo;
    private final PaymentRepository paymentRepo;
    private final SettlementService settlementService;

    private boolean canAccessShop(String role, String shopId, String callerShopId) {
        return PLATFORM_ROLES.contains(role) || (SHOP_FINANCE_ROLES.contains(role) && shopId.equals(callerShopId));
    }

    /** Audit report — every settlement run for a shop, newest first. */
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<Page<Settlement>>> shopSettlements(
            @PathVariable String shopId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(settlementRepo.findByShopIdOrderByCreatedAtDesc(shopId, pg)));
    }

    /** Platform-wide settlement audit report. */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<Settlement>>> allSettlements(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!PLATFORM_ROLES.contains(role)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(settlementRepo.findAllByOrderByCreatedAtDesc(pg)));
    }

    /** Drill-down — the payments folded into one settlement batch. Same shop-scoped
     *  authorization as the listing endpoint, resolved via the settlement's own shopId
     *  since the caller only supplies the settlement id here. */
    @GetMapping("/{settlementId}/payments")
    public ResponseEntity<ApiResponse<List<Payment>>> settlementPayments(
            @PathVariable UUID settlementId,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        return settlementRepo.findById(settlementId)
            .map(s -> {
                if (!canAccessShop(role, s.getShopId(), callerShopId)) {
                    return ResponseEntity.status(403).body(ApiResponse.<List<Payment>>error("Forbidden"));
                }
                return ResponseEntity.ok(ApiResponse.ok(paymentRepo.findBySettlementIdOrderByPaidAtAsc(settlementId)));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    /** Manual/on-demand settlement — for shop owners/managers or admins who don't want to
     *  wait for the nightly job, or need to re-run one after fixing the auto-settlement
     *  setting. */
    @PostMapping("/shop/{shopId}/run")
    public ResponseEntity<ApiResponse<Settlement>> runManual(
            @PathVariable String shopId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if (!canAccessShop(role, shopId, callerShopId)) {
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        Settlement result = settlementService.runManualSettlement(shopId, uid);
        return ResponseEntity.ok(ApiResponse.ok("Settlement run complete", result));
    }
}
