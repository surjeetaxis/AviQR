package in.aviqr.payment.controller;
import in.aviqr.payment.dto.*;
import in.aviqr.payment.entity.*;
import in.aviqr.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Value("${razorpay.key.id:rzp_test_key}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:rzp_test_secret}")
    private String razorpaySecret;

    private boolean canAccessShop(String role, String callerShopId, String resourceShopId) {
        if ("ADMIN".equals(role)) return true;
        return resourceShopId != null && resourceShopId.equals(callerShopId)
            && Set.of("OWNER", "MANAGER").contains(role);
    }

    private ResponseEntity<ApiResponse<Void>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }

    // Create Razorpay order — called before checkout
    @PostMapping("/create-order")
    public ResponseEntity<ApiResponse<Map<String,Object>>> createOrder(@RequestBody CreatePaymentOrderRequest req) {
        // In production: call Razorpay API to create order
        // Returning mock response for now
        Map<String,Object> result = new HashMap<>();
        String rzpOrderId = "order_" + UUID.randomUUID().toString().replace("-","").substring(0,16);
        result.put("razorpayOrderId", rzpOrderId);
        result.put("amount", req.getAmount().multiply(BigDecimal.valueOf(100)).longValue()); // in paise
        result.put("currency", req.getCurrency() != null ? req.getCurrency() : "INR");
        result.put("key", razorpayKeyId);

        // Persist pending payment
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

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // Verify payment signature after Razorpay redirect
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<Map<String,Object>>> verify(@RequestBody PaymentVerifyRequest req) {
        try {
            String data = req.getRazorpayOrderId() + "|" + req.getRazorpayPaymentId();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpaySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            String generated = HexFormat.of().formatHex(hash);

            boolean valid = generated.equals(req.getRazorpaySignature());

            // Update payment record
            repo.findByOrderId(req.getOrderId()).ifPresent(p -> {
                p.setPaymentId(req.getRazorpayPaymentId());
                p.setStatus(valid ? PaymentStatus.CAPTURED : PaymentStatus.FAILED);
                p.setPaidAt(valid ? LocalDateTime.now() : null);
                repo.save(p);
            });

            Map<String,Object> result = new HashMap<>();
            result.put("verified", valid);
            result.put("paymentId", req.getRazorpayPaymentId());
            result.put("orderId", req.getOrderId());

            return ResponseEntity.ok(ApiResponse.ok(valid ? "Payment verified" : "Verification failed", result));
        } catch (Exception e) {
            log.error("Payment verification error", e);
            return ResponseEntity.ok(ApiResponse.error("Verification error: " + e.getMessage()));
        }
    }

    // Razorpay webhook
    @PostMapping("/webhook/razorpay")
    public ResponseEntity<String> webhook(
            @RequestBody String payload,
            @RequestHeader(value="X-Razorpay-Signature", required=false) String signature) {
        log.info("Razorpay webhook received");
        // In production: verify webhook signature and process event
        return ResponseEntity.ok("OK");
    }

    // Get payments for shop
    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> shopPayments(
            @PathVariable String shopId,
            @RequestParam(required=false) String status,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canAccessShop(role, callerShopId, shopId)) return forbidden();
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Payment> payments = status != null
            ? repo.findByShopIdAndStatus(shopId, PaymentStatus.valueOf(status.toUpperCase()), pg)
            : repo.findByShopIdOrderByCreatedAtDesc(shopId, pg);
        return ResponseEntity.ok(ApiResponse.ok(payments));
    }

    // Get single payment — admin, the owning shop's staff, or the customer who paid
    @GetMapping("/{paymentId}")
    public ResponseEntity<?> getByPaymentId(@PathVariable String paymentId,
                                             @RequestHeader("X-User-Id") String uid,
                                             @RequestHeader("X-User-Role") String role,
                                             @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        var payment = repo.findByPaymentId(paymentId).orElse(null);
        if (payment == null) return ResponseEntity.notFound().build();
        boolean isPayer = uid.equals(payment.getCustomerId());
        if (!canAccessShop(role, callerShopId, payment.getShopId()) && !isPayer) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(payment));
    }

    // Initiate refund — admin or the owning shop's owner/manager
    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<?> refund(@PathVariable String paymentId,
                                     @RequestHeader("X-User-Id") String uid,
                                     @RequestHeader("X-User-Role") String role,
                                     @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        var payment = repo.findByPaymentId(paymentId).orElse(null);
        if (payment == null) return ResponseEntity.notFound().build();
        if (!canAccessShop(role, callerShopId, payment.getShopId())) return forbidden();
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundedAt(LocalDateTime.now());
        repo.save(payment);
        Map<String,Object> r = new HashMap<>();
        r.put("paymentId", paymentId); r.put("status", "REFUNDED");
        return ResponseEntity.ok(ApiResponse.ok("Refund initiated", r));
    }

    // Admin — all payments across every tenant
    @GetMapping
    public ResponseEntity<?> allPayments(
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestHeader("X-User-Role") String role) {
        if (!"ADMIN".equals(role)) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok(repo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }
}