package in.aviqr.payment.controller;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import in.aviqr.payment.dto.*;
import in.aviqr.payment.entity.*;
import in.aviqr.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/v1/payments") @RequiredArgsConstructor @Slf4j
public class PaymentController {

    // Payment records (amount, customerId, gateway response) are financial data — CASHIER can
    // view them (reconciliation is part of the role) but narrower shop roles (KITCHEN,
    // MENU_EDITOR, ORDER_VIEWER) and non-staff roles (CUSTOMER, SUPPLIER, HOTEL, MALL) cannot,
    // even when their JWT carries a matching X-Shop-Id.
    private static final Set<String> SHOP_VIEW_ROLES = Set.of("OWNER", "MANAGER", "CASHIER");
    // Refunds reverse money already captured — reserved for shop management, not front-line staff.
    private static final Set<String> SHOP_FINANCE_ROLES = Set.of("OWNER", "MANAGER");
    private static final Set<String> PLATFORM_ROLES = Set.of("ADMIN", "SUPPORT");

    private final PaymentRepository repo;
    private final RestTemplate restTemplate;

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:rzp_test_placeholder_secret}")
    private String razorpaySecret;

    @Value("${razorpay.webhook.secret:placeholder_secret}")
    private String razorpayWebhookSecret;

    @Value("${internal.sync.secret:}")
    private String internalSyncSecret;

    /** Notifies order-qr-service once a payment is captured — for an ORDER this releases a
     *  pay-at-counter-gated order straight to the kitchen without a manual cashier step; for
     *  a BILL (consolidated table bill) it marks the bill (and its orders) PAID/settled so the
     *  staff Kanban board picks it up on its next poll. Never allowed to block or fail the
     *  payment response — sync issues are logged only. */
    private void syncOrderPaymentCaptured(String orderId, PaymentTargetType targetType) {
        if (orderId == null || orderId.isBlank()) return;
        String path = targetType == PaymentTargetType.BILL
            ? "http://order-qr-service/api/v1/bills/" + orderId + "/payment-sync"
            : "http://order-qr-service/api/v1/orders/" + orderId + "/payment-sync";
        try {
            HttpHeaders headers = new HttpHeaders();
            if (!internalSyncSecret.isBlank()) headers.set("X-Internal-Secret", internalSyncSecret);
            restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(headers), Void.class);
        } catch (Exception e) {
            log.warn("Failed to sync payment capture to order-qr-service for orderId={} targetType={}: {}", orderId, targetType, e.getMessage());
        }
    }

    /** Create a real Razorpay order — called before Razorpay checkout */
    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<Map<String,Object>>> createOrder(@RequestBody CreatePaymentOrderRequest req,
        @RequestHeader(value="X-User-Id",defaultValue="") String uid,
        @RequestHeader(value="X-User-Role",defaultValue="") String role,
        @RequestHeader(value="X-Shop-Id",defaultValue="") String callerShop,
        @RequestHeader(value="X-Internal-Secret",defaultValue="") String internal) {
        if(req.getAmount()==null || req.getAmount().signum()<=0 || req.getAmount().scale()>2 || req.getAmount().compareTo(new BigDecimal("10000000"))>0)
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid payment amount"));
        String type=req.getTargetType()==null?"ORDER":req.getTargetType().toUpperCase(Locale.ROOT);
        if(Set.of("PMS_FOLIO","PMS_PREAUTH").contains(type)) {
            if(!in.aviqr.security.ServiceTrustConfiguration.matches(internalSyncSecret,internal))return ResponseEntity.status(403).body(ApiResponse.error("PMS payments require authenticated PMS orchestration"));
        } else {
            if(!Set.of("ORDER","BILL").contains(type) || Boolean.TRUE.equals(req.getPreAuth()))return ResponseEntity.badRequest().body(ApiResponse.error("Invalid payment target"));
            Map target;
            try {target=restTemplate.getForObject("http://order-qr-service/api/v1/orders/internal/payment-target/"+UUID.fromString(req.getOrderId())+"?type="+type,Map.class);}
            catch(Exception e){return ResponseEntity.status(503).body(ApiResponse.error("Payment target unavailable"));}
            boolean own=target!=null && target.get("customerIds") instanceof List ids && !ids.isEmpty() && !uid.isBlank() && ids.stream().allMatch(uid::equals);
            String shop=target==null?null:String.valueOf(target.get("shopId"));
            if(!own && !PLATFORM_ROLES.contains(role) && !(SHOP_VIEW_ROLES.contains(role) && Objects.equals(shop,callerShop)))return ResponseEntity.status(403).body(ApiResponse.error("Payment target access denied"));
            if(!Objects.equals(shop,req.getShopId()) || new BigDecimal(target.get("amount").toString()).compareTo(req.getAmount())!=0)return ResponseEntity.badRequest().body(ApiResponse.error("Payment amount or shop does not match the order"));
            req.setCustomerId(own?uid:null);
        }
        if(req.getCurrency()!=null && !"INR".equals(req.getCurrency()))return ResponseEntity.badRequest().body(ApiResponse.error("Unsupported currency"));
        Map<String,Object> result = new HashMap<>();

        try {
            // ── REAL Razorpay API call ─────────────────────────────────────
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpaySecret);
            JSONObject orderReq = new JSONObject();
            long amountPaise = req.getAmount().multiply(BigDecimal.valueOf(100)).longValue();
            orderReq.put("amount",   amountPaise);
            orderReq.put("currency", req.getCurrency() != null ? req.getCurrency() : "INR");
            orderReq.put("receipt",  "aviqr_" + System.currentTimeMillis());
            orderReq.put("notes",    new JSONObject().put("shopId", req.getShopId())
                                                     .put("orderId", req.getOrderId()));
            // Auth-only hold (card pre-authorization): the order captures nothing until
            // /{paymentId}/capture is called explicitly — see PaymentTargetType.PMS_PREAUTH.
            if (Boolean.TRUE.equals(req.getPreAuth())) orderReq.put("payment_capture", 0);

            Order rzpOrder = razorpay.orders.create(orderReq);
            String rzpOrderId = rzpOrder.get("id");
            // ────────────────────────────────────────────────────────────────

            result.put("razorpayOrderId", rzpOrderId);
            result.put("amount",   amountPaise);
            result.put("currency", req.getCurrency() != null ? req.getCurrency() : "INR");
            result.put("key",      razorpayKeyId);

            Payment p = Payment.builder()
                .paymentId("pay_pending_" + System.currentTimeMillis())
                .razorpayOrderId(rzpOrderId)
                .orderId(req.getOrderId())
                .targetType(req.getTargetType() != null ? PaymentTargetType.valueOf(req.getTargetType().toUpperCase()) : PaymentTargetType.ORDER)
                .shopId(req.getShopId())
                .customerId(req.getCustomerId())
                .amount(req.getAmount())
                .currency(req.getCurrency() != null ? req.getCurrency() : "INR")
                .gateway(PaymentGateway.RAZORPAY)
                .build();
            repo.save(p);
            log.info("Razorpay order created: {} for ₹{}", rzpOrderId, req.getAmount());

        } catch (Exception e) {
            log.error("Razorpay order creation failed: {}", e.getMessage(), e);
            // Graceful degradation in dev/staging with placeholder keys
            if (razorpayKeyId.startsWith("rzp_test_placeholder")) {
                String mockId = "order_mock_" + UUID.randomUUID().toString().replace("-","").substring(0,16);
                result.put("razorpayOrderId", mockId);
                result.put("amount",   req.getAmount().multiply(BigDecimal.valueOf(100)).longValue());
                result.put("currency", "INR");
                result.put("key",      razorpayKeyId);
                result.put("_dev_note","Placeholder Razorpay keys in use — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");
            } else {
                return ResponseEntity.status(500).body(ApiResponse.error("Payment gateway unavailable"));
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Verify Razorpay payment signature — called after Razorpay checkout completes */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String,Object>>> verify(@RequestBody PaymentVerifyRequest req,
        @RequestHeader(value="X-User-Id",defaultValue="") String uid,
        @RequestHeader(value="X-User-Role",defaultValue="") String role,
        @RequestHeader(value="X-Shop-Id",defaultValue="") String callerShop,
        @RequestHeader(value="X-Internal-Secret",defaultValue="") String internal) {
        var stored=repo.findByRazorpayOrderId(req.getRazorpayOrderId()).orElse(null);
        if(stored==null || !Objects.equals(stored.getOrderId(),req.getOrderId()))return ResponseEntity.badRequest().body(ApiResponse.error("Payment order mismatch"));
        boolean allowed=in.aviqr.security.ServiceTrustConfiguration.matches(internalSyncSecret,internal) || PLATFORM_ROLES.contains(role) ||
            (!uid.isBlank() && uid.equals(stored.getCustomerId())) || (SHOP_VIEW_ROLES.contains(role) && Objects.equals(stored.getShopId(),callerShop));
        if(!allowed)return ResponseEntity.status(403).body(ApiResponse.error("Payment access denied"));
        try {
            String data = req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hash);
            boolean valid = req.getRazorpaySignature()!=null && java.security.MessageDigest.isEqual(generated.getBytes(StandardCharsets.UTF_8),req.getRazorpaySignature().getBytes(StandardCharsets.UTF_8));
            if(!valid)return ResponseEntity.badRequest().body(ApiResponse.error("Invalid payment signature"));

            var paymentOpt = Optional.of(stored);
            paymentOpt.ifPresent(p -> {
                p.setPaymentId(req.getRazorpayPaymentId());
                boolean isPreAuth = p.getTargetType() == PaymentTargetType.PMS_PREAUTH;
                // A pre-auth order settles as AUTHORIZED (a held-but-uncaptured hold) — it
                // only becomes CAPTURED once staff explicitly captures it at checkout.
                p.setStatus(!valid ? PaymentStatus.FAILED : isPreAuth ? PaymentStatus.AUTHORIZED : PaymentStatus.CAPTURED);
                p.setPaidAt(valid && !isPreAuth ? LocalDateTime.now() : null);
                repo.save(p);
            });
            if (valid) paymentOpt.ifPresent(p -> {
                if (p.getTargetType() != PaymentTargetType.PMS_PREAUTH) syncOrderPaymentCaptured(p.getOrderId(), p.getTargetType());
            });

            Map<String,Object> res = new HashMap<>();
            res.put("verified",  valid);
            res.put("paymentId", req.getRazorpayPaymentId());
            res.put("orderId",   req.getOrderId());
            log.info("Payment verification: paymentId={} valid={}", req.getRazorpayPaymentId(), valid);
            return ResponseEntity.ok(ApiResponse.ok(valid ? "Payment verified" : "Signature mismatch", res));

        } catch (Exception e) {
            log.error("Payment verification error", e);
            return ResponseEntity.ok(ApiResponse.error("Payment verification failed"));
        }
    }

    /** Razorpay webhook — processes payment.captured, payment.failed, refund.processed events */
    @PostMapping("/webhook/razorpay")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        // 1. Verify webhook signature (skipped only when running with placeholder dev secrets)
        boolean devMode = razorpayWebhookSecret.equals("placeholder_secret");
        if (!devMode) {
            if (signature == null) {
                log.warn("Razorpay webhook received with no signature header");
                return ResponseEntity.status(400).body("Missing signature");
            }
            try {
                Mac mac = Mac.getInstance("HmacSHA256");
                mac.init(new SecretKeySpec(razorpayWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                String computed = HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
                if (!java.security.MessageDigest.isEqual(computed.getBytes(StandardCharsets.UTF_8),signature.getBytes(StandardCharsets.UTF_8))) {
                    log.warn("Razorpay webhook signature mismatch");
                    return ResponseEntity.status(400).body("Invalid signature");
                }
            } catch (Exception e) {
                log.error("Webhook signature check failed", e);
                return ResponseEntity.status(500).body("Error");
            }
        }

        if(razorpayWebhookSecret.isBlank() || razorpayWebhookSecret.startsWith("placeholder"))return ResponseEntity.status(503).body("Webhook not configured");
        // 2. Parse and handle event
        try {
            JSONObject event = new JSONObject(payload);
            String eventName = event.optString("event");
            log.info("Razorpay webhook: {}", eventName);

            JSONObject paymentEntity = event.optJSONObject("payload") != null
                ? event.getJSONObject("payload").optJSONObject("payment") != null
                    ? event.getJSONObject("payload").getJSONObject("payment").optJSONObject("entity")
                    : null
                : null;

            if (paymentEntity != null) {
                String rzpOrderId = paymentEntity.optString("order_id");
                String rzpPayId   = paymentEntity.optString("id");

                switch (eventName) {
                    case "payment.captured" -> repo.findByRazorpayOrderId(rzpOrderId).ifPresent(p -> {
                        p.setPaymentId(rzpPayId);
                        p.setStatus(PaymentStatus.CAPTURED);
                        p.setPaidAt(LocalDateTime.now());
                        repo.save(p);
                        log.info("Webhook: payment.captured for orderId={}", rzpOrderId);
                        syncOrderPaymentCaptured(p.getOrderId(), p.getTargetType());
                    });
                    case "payment.failed" -> repo.findByRazorpayOrderId(rzpOrderId).ifPresent(p -> {
                        p.setStatus(PaymentStatus.FAILED);
                        repo.save(p);
                        log.info("Webhook: payment.failed for orderId={}", rzpOrderId);
                    });
                    case "refund.processed" -> repo.findByRazorpayOrderId(rzpOrderId).ifPresent(p -> {
                        p.setStatus(PaymentStatus.REFUNDED);
                        p.setRefundedAt(LocalDateTime.now());
                        repo.save(p);
                        log.info("Webhook: refund.processed for orderId={}", rzpOrderId);
                    });
                    default -> log.debug("Unhandled webhook event: {}", eventName);
                }
            }
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok("OK");
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<ApiResponse<Page<Payment>>> shopPayments(
            @PathVariable String shopId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        boolean allowed = PLATFORM_ROLES.contains(role)
            || (SHOP_VIEW_ROLES.contains(role) && shopId.equals(callerShopId));
        if (!allowed) {
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Payment> payments = status != null
            ? repo.findByShopIdAndStatus(shopId, PaymentStatus.valueOf(status.toUpperCase()), pg)
            : repo.findByShopIdOrderByCreatedAtDesc(shopId, pg);
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    // Support/Admin — look up a specific customer's payment history (e.g. to
    // investigate a support ticket), rather than the full platform-wide ledger.
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<Page<Payment>>> customerPayments(
            @PathVariable String customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role) && !customerId.equals(uid))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.ok(repo.findByCustomerIdOrderByCreatedAtDesc(customerId, pg)));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<Payment>> getByPaymentId(
            @PathVariable String paymentId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        return repo.findByPaymentId(paymentId)
            .map(p -> {
                boolean allowed = PLATFORM_ROLES.contains(role)
                    || uid.equals(p.getCustomerId())
                    || (SHOP_VIEW_ROLES.contains(role) && p.getShopId().equals(callerShopId));
                if (!allowed) {
                    return ResponseEntity.status(403).body(ApiResponse.<Payment>error("Forbidden"));
                }
                return ResponseEntity.ok(ApiResponse.ok(p));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<ApiResponse<Map<String,Object>>> refund(
            @PathVariable String paymentId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        return repo.lockByPaymentId(paymentId).map(p -> {
            boolean allowed = PLATFORM_ROLES.contains(role)
                || (SHOP_FINANCE_ROLES.contains(role) && p.getShopId().equals(callerShopId));
            if (!allowed) {
                return ResponseEntity.status(403).body(ApiResponse.<Map<String,Object>>error("Forbidden"));
            }
            if(p.getStatus()!=PaymentStatus.CAPTURED)return ResponseEntity.status(409).body(ApiResponse.<Map<String,Object>>error("Only captured payments can be refunded"));
            try {
                if (!razorpaySecret.startsWith("rzp_test_placeholder")) {
                    RazorpayClient rzp = new RazorpayClient(razorpayKeyId, razorpaySecret);
                    rzp.payments.refund(p.getPaymentId(), new JSONObject().put("speed","normal"));
                }
            } catch (Exception e) { log.error("Razorpay refund API error: {}", e.getMessage()); return ResponseEntity.status(502).body(ApiResponse.<Map<String,Object>>error("Refund provider rejected the request")); }
            p.setStatus(PaymentStatus.REFUNDED);
            p.setRefundedAt(LocalDateTime.now());
            repo.save(p);
            Map<String,Object> r = Map.of("paymentId", paymentId, "status", "REFUNDED");
            return ResponseEntity.ok(ApiResponse.ok("Refund initiated", r));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Settles a pre-authorized (AUTHORIZED) hold — the actual charge happens now,
     *  not at the original card-hold time. Used at PMS checkout to collect what a
     *  pre-auth secured at booking/check-in. */
    @org.springframework.transaction.annotation.Transactional
    @PostMapping("/{paymentId}/capture")
    public ResponseEntity<ApiResponse<Payment>> capture(
            @PathVariable String paymentId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestHeader(value="X-Shop-Id", defaultValue="") String callerShopId) {
        return repo.lockByPaymentId(paymentId).map(p -> {
            boolean allowed = PLATFORM_ROLES.contains(role)
                || (SHOP_FINANCE_ROLES.contains(role) && p.getShopId().equals(callerShopId));
            if (!allowed) return ResponseEntity.status(403).body(ApiResponse.<Payment>error("Forbidden"));
            if (p.getStatus() != PaymentStatus.AUTHORIZED)
                return ResponseEntity.badRequest().body(ApiResponse.<Payment>error("Only an AUTHORIZED hold can be captured (current status: " + p.getStatus() + ")"));
            try {
                if (!razorpayKeyId.startsWith("rzp_test_placeholder")) {
                    RazorpayClient rzp = new RazorpayClient(razorpayKeyId, razorpaySecret);
                    long amountPaise = p.getAmount().multiply(BigDecimal.valueOf(100)).longValue();
                    rzp.payments.capture(p.getPaymentId(), new JSONObject().put("amount", amountPaise).put("currency", p.getCurrency()));
                }
            } catch (Exception e) {
                log.error("Razorpay capture API error: {}", e.getMessage());
                return ResponseEntity.status(500).body(ApiResponse.<Payment>error("Capture provider rejected the request"));
            }
            p.setStatus(PaymentStatus.CAPTURED);
            p.setPaidAt(LocalDateTime.now());
            repo.save(p);
            return ResponseEntity.ok(ApiResponse.ok("Captured", p));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Server-to-server lookup by orderId (e.g. pms-service checking a reservation's
     *  pre-auth status) — trusts a shared secret instead of a caller JWT, same
     *  X-Internal-Secret convention as order-qr-service/auth-service. */
    @GetMapping("/by-order/{orderId}")
    public ResponseEntity<ApiResponse<Payment>> byOrderId(
            @PathVariable String orderId,
            @RequestHeader(value="X-Internal-Secret", required=false) String secret) {
        if (internalSyncSecret.isBlank() || !internalSyncSecret.equals(secret))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return repo.findByOrderId(orderId)
            .map(p -> ResponseEntity.ok(ApiResponse.ok(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<Payment>>> allPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(
            repo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }
}
