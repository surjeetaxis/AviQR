package in.aviqr.paymentgateway.controller;

import in.aviqr.paymentgateway.gateway.PaymentGateway;
import in.aviqr.paymentgateway.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** What the guest's browser and the gateways reach: the hand-off page and the result URLs.
 *  Nothing here trusts the request; the gateway provider verifies every result. */
@RestController @RequiredArgsConstructor
@RequestMapping("/api/v1/payment-gateway/public")
public class PublicPaymentController {
    private final PaymentService payments;

    @GetMapping(value = "/pay/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> pay(@PathVariable UUID id) {
        return html(payments.payPage(id));
    }

    /** The gateway sends the guest back here, by GET or form POST, with its result. */
    @RequestMapping(value = "/callback/{id}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<String> callback(@PathVariable UUID id, @RequestParam Map<String, String> params) {
        String next = payments.complete(id, new LinkedHashMap<>(params));
        if (next == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_PLAIN).body("Payment not found");
        return ResponseEntity.status(HttpStatus.SEE_OTHER).location(URI.create(next)).build();
    }

    /** For gateways whose return URL is fixed in the merchant panel: the result names our reference. */
    @RequestMapping(value = "/return/{gateway}", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<String> fixedReturn(@PathVariable String gateway, @RequestParam Map<String, String> params) {
        PaymentGateway g = parse(gateway);
        if (g == null) return ResponseEntity.notFound().build();
        return payments.completeByReference(g, new LinkedHashMap<>(params))
            .map(payments::returnUrl)
            .map(next -> ResponseEntity.status(HttpStatus.SEE_OTHER).location(URI.create(next)).<String>build())
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).contentType(MediaType.TEXT_PLAIN).body("Payment not found"));
    }

    /** Server-to-server notifications (AsiaPay datafeed and similar). The gateway expects "OK". */
    @PostMapping(value = "/notify/{gateway}", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> notify(@PathVariable String gateway, @RequestParam Map<String, String> params) {
        PaymentGateway g = parse(gateway);
        if (g == null) return ResponseEntity.notFound().build();
        payments.completeByReference(g, new LinkedHashMap<>(params));
        return ResponseEntity.ok("OK");
    }

    private static PaymentGateway parse(String g) {
        try { return PaymentGateway.valueOf(g.toUpperCase(Locale.ROOT)); } catch (IllegalArgumentException e) { return null; }
    }

    private static ResponseEntity<String> html(String body) {
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML)
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header("Referrer-Policy", "no-referrer")
            .header("X-Frame-Options", "DENY")
            .body(body);
    }
}
