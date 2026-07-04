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
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/v1/payments") @RequiredArgsConstructor @Slf4j
public class PaymentController {

    private final PaymentRepository repo;

    @Value("${razorpay.key.id:rzp_test_placeholder}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:rzp_test_placeholder_secret}")
    private String razorpaySecret;

    @Value("${razorpay.webhook.secret:placeholder_secret}")
    private String razorpayWebhookSecret;

    /** Create a real Razorpay order — called before Razorpay checkout */
    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<Map<String,Object>>> createOrder(@RequestBody CreatePaymentOrderRequest req) {
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
                return ResponseEntity.status(500).body(ApiResponse.error("Payment gateway error: " + e.getMessage()));
            }
        }

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /** Verify Razorpay payment signature — called after Razorpay checkout completes */
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String,Object>>> verify(@RequestBody PaymentVerifyRequest req) {
        try {
            String data = req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hash);
            boolean valid = generated.equals(req.getRazorpaySignature());

            repo.findByOrderId(req.getOrderId()).ifPresent(p -> {
                p.setPaymentId(req.getRazorpayPaymentId());
                p.setStatus(valid ? PaymentStatus.CAPTURED : PaymentStatus.FAILED);
                p.setPaidAt(valid ? LocalDateTime.now() : null);
                repo.save(p);
            });

            Map<String,Object> res = new HashMap<>();
            res.put("verified",  valid);
            res.put("paymentId", req.getRazorpayPaymentId());
            res.put("orderId",   req.getOrderId());
            log.info("Payment verification: paymentId={} valid={}", req.getRazorpayPaymentId(), valid);
            return ResponseEntity.ok(ApiResponse.ok(valid ? "Payment verified" : "Signature mismatch", res));

        } catch (Exception e) {
            log.error("Payment verification error", e);
            return ResponseEntity.ok(ApiResponse.error("Verification error: " + e.getMessage()));
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
                if (!computed.equals(signature)) {
                    log.warn("Razorpay webhook signature mismatch");
                    return ResponseEntity.status(400).body("Invalid signature");
                }
            } catch (Exception e) {
                log.error("Webhook signature check failed", e);
                return ResponseEntity.status(500).body("Error");
            }
        }

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
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role)) {
            if (!shopId.equals(callerShopId))
                return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Payment> payments = status != null
            ? repo.findByShopIdAndStatus(shopId, PaymentStatus.valueOf(status.toUpperCase()), pg)
            : repo.findByShopIdOrderByCreatedAtDesc(shopId, pg);
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<ApiResponse<Payment>> getByPaymentId(@PathVariable String paymentId) {
        return repo.findByPaymentId(paymentId)
            .map(p -> ResponseEntity.ok(ApiResponse.ok(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<ApiResponse<Map<String,Object>>> refund(
            @PathVariable String paymentId,
            @RequestHeader("X-User-Id") String uid) {
        return repo.findByPaymentId(paymentId).map(p -> {
            try {
                if (!razorpaySecret.startsWith("rzp_test_placeholder")) {
                    RazorpayClient rzp = new RazorpayClient(razorpayKeyId, razorpaySecret);
                    rzp.payments.refund(p.getPaymentId(), new JSONObject().put("speed","normal"));
                }
            } catch (Exception e) { log.error("Razorpay refund API error: {}", e.getMessage()); }
            p.setStatus(PaymentStatus.REFUNDED);
            p.setRefundedAt(LocalDateTime.now());
            repo.save(p);
            Map<String,Object> r = Map.of("paymentId", paymentId, "status", "REFUNDED");
            return ResponseEntity.ok(ApiResponse.ok("Refund initiated", r));
        }).orElse(ResponseEntity.notFound().build());
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
