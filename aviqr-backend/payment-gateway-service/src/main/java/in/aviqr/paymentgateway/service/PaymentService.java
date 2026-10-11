package in.aviqr.paymentgateway.service;

import in.aviqr.paymentgateway.entity.GatewayAccount;
import in.aviqr.paymentgateway.entity.GatewayTransaction;
import in.aviqr.paymentgateway.entity.TransactionStatus;
import in.aviqr.paymentgateway.gateway.*;
import in.aviqr.paymentgateway.repository.GatewayAccountRepository;
import in.aviqr.paymentgateway.repository.GatewayTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;

/** Starts hosted payments and records the gateways' results. */
@Service @RequiredArgsConstructor @Slf4j
public class PaymentService {
    private static final char[] REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private final SecureRandom random = new SecureRandom();

    private final GatewayTransactionRepository transactions;
    private final GatewayAccountRepository accounts;
    private final AccountService accountService;
    private final GatewayRegistry registry;
    private final CredentialCipher cipher;

    @Value("${payment-gateway.public-base-url:https://api.aviqr.com}") private String publicBaseUrl;

    public record CreateRequest(UUID hotelId, BigDecimal amount, String currency, String purpose, String externalReference,
                                String description, String returnUrl, String guestName, String guestEmail, String guestPhone,
                                PaymentGateway gateway) { }

    public record TransactionView(UUID id, String reference, UUID hotelId, PaymentGateway gateway, BigDecimal amount, String currency,
                                  TransactionStatus status, String purpose, String externalReference, String pgTransactionId,
                                  String message, boolean testMode, LocalDateTime createdAt, LocalDateTime completedAt, String payUrl) { }

    /** Which gateway, if any, guests of this hotel can pay through online. */
    public Optional<Map<String, Object>> checkoutOption(UUID hotelId) {
        return accountService.checkoutAccount(hotelId, null).map(a -> Map.of(
            "gateway", a.getGateway(), "label", registry.get(a.getGateway()).label(), "testMode", Boolean.TRUE.equals(a.getTestMode())));
    }

    public TransactionView create(CreateRequest req) {
        if (req.hotelId() == null) throw new GatewayException("hotelId is required");
        if (req.amount() == null || req.amount().signum() <= 0 || req.amount().compareTo(new BigDecimal("10000000")) > 0)
            throw new GatewayException("Amount must be positive");
        String currency = req.currency() == null ? "INR" : req.currency().trim().toUpperCase(Locale.ROOT);
        try { Currency.getInstance(currency); } catch (IllegalArgumentException e) { throw new GatewayException("Unknown currency " + currency); }
        validateReturnUrl(req.returnUrl());
        GatewayAccount account = accountService.checkoutAccount(req.hotelId(), req.gateway())
            .orElseThrow(() -> new GatewayException("This hotel hasn't set up online payments"));
        GatewayTransaction t = GatewayTransaction.builder()
            .reference(newReference()).hotelId(req.hotelId()).accountId(account.getId()).gateway(account.getGateway())
            .amount(req.amount().setScale(Money.digits(currency), java.math.RoundingMode.HALF_UP)).currency(currency)
            .status(TransactionStatus.CREATED).purpose(trim(req.purpose(), 40)).externalReference(trim(req.externalReference(), 80))
            .description(trim(req.description(), 200)).returnUrl(req.returnUrl()).guestName(trim(req.guestName(), 120))
            .guestEmail(trim(req.guestEmail(), 254)).guestPhone(trim(req.guestPhone(), 32)).testMode(account.getTestMode()).build();
        return view(transactions.save(t));
    }

    public Optional<TransactionView> get(UUID id) { return transactions.findById(id).map(this::view); }

    public List<TransactionView> recent(UUID hotelId) {
        return transactions.findByHotelIdOrderByCreatedAtDesc(hotelId, org.springframework.data.domain.PageRequest.of(0, 100)).stream().map(this::view).toList();
    }

    /** The page that hands the guest to the gateway. */
    public String payPage(UUID id) {
        GatewayTransaction t = transactions.findById(id).orElse(null);
        if (t == null) return Pages.message("Payment not found", "This payment link isn't valid.");
        if (t.getStatus().terminal() || t.getStatus() == TransactionStatus.UNVERIFIED)
            return Pages.shell("Payment", "<meta http-equiv=\"refresh\" content=\"0;url=" + Pages.esc(returnTo(t)) + "\">", "<p>Returning you to the hotel…</p>");
        if (t.getCreatedAt() != null && t.getCreatedAt().isBefore(LocalDateTime.now().minusHours(2)))
            return Pages.message("Payment link expired", "Please go back to the booking page and try again.");
        GatewayProvider provider = registry.get(t.getGateway());
        Map<String, String> state = cipher.open(t.getProviderState());
        try {
            Checkout checkout = provider.begin(context(t, state));
            t.setProviderState(cipher.seal(state));
            t.setStatus(TransactionStatus.PENDING);
            transactions.save(t);
            return switch (checkout.kind()) {
                case REDIRECT -> Pages.shell("Redirecting to payment…", "<meta http-equiv=\"refresh\" content=\"0;url=" + Pages.esc(checkout.url()) + "\">",
                    "<div class=\"spin\"></div><p>Taking you to the secure payment page…</p><p><a href=\"" + Pages.esc(checkout.url()) + "\">Continue</a></p>");
                case FORM_POST -> Pages.autoPost(checkout.url(), checkout.fields());
                case PAGE -> checkout.html();
            };
        } catch (Exception e) {
            log.warn("{} could not start payment {}: {}", t.getGateway(), t.getReference(), e.getMessage());
            finish(t, TransactionStatus.FAILED, null, null, "Could not start: " + e.getMessage());
            return Pages.shell("Payment unavailable", "<meta http-equiv=\"refresh\" content=\"4;url=" + Pages.esc(returnTo(t)) + "\">",
                "<h2>The payment page couldn't open</h2><p>Returning you to the hotel…</p>");
        }
    }

    /** A gateway result for a known transaction; returns where to send the guest. */
    public String complete(UUID id, Map<String, String> params) {
        GatewayTransaction t = transactions.findById(id).orElse(null);
        if (t == null) return null;
        record(t, params);
        return returnTo(transactions.findById(id).orElse(t));
    }

    /** A gateway result that names only our reference (fixed return URLs and server notifications). */
    public Optional<GatewayTransaction> completeByReference(PaymentGateway gateway, Map<String, String> params) {
        String reference = registry.get(gateway).referenceOf(params);
        if (reference == null) return Optional.empty();
        Optional<GatewayTransaction> found = transactions.findByReference(reference.trim()).filter(t -> t.getGateway() == gateway);
        found.ifPresent(t -> record(t, params));
        return found.flatMap(t -> transactions.findById(t.getId()));
    }

    /** Staff confirmed an UNVERIFIED payment (or rejected it) after checking the gateway dashboard. */
    public TransactionView resolve(UUID id, boolean paid, String staffId) {
        GatewayTransaction t = transactions.findById(id).orElseThrow(() -> new GatewayException("Payment not found"));
        if (t.getStatus() != TransactionStatus.UNVERIFIED && t.getStatus() != TransactionStatus.PENDING)
            throw new GatewayException("Only pending or unverified payments can be confirmed");
        finish(t, paid ? TransactionStatus.PAID : TransactionStatus.FAILED, t.getPgTransactionId(), t.getBankTransactionId(),
            (paid ? "Confirmed" : "Rejected") + " by staff " + staffId);
        return view(t);
    }

    private void record(GatewayTransaction t, Map<String, String> params) {
        if (t.getStatus().terminal()) return; // a repeated callback or notification changes nothing
        Map<String, String> state = cipher.open(t.getProviderState());
        Outcome outcome;
        try {
            outcome = registry.get(t.getGateway()).complete(context(t, state), params == null ? Map.of() : params);
        } catch (Exception e) {
            log.warn("{} result for {} could not be read: {}", t.getGateway(), t.getReference(), e.getMessage());
            outcome = Outcome.pending("Result could not be read: " + e.getMessage());
        }
        TransactionStatus status = switch (outcome.status()) {
            case PAID -> TransactionStatus.PAID;
            case FAILED -> TransactionStatus.FAILED;
            case PENDING -> TransactionStatus.PENDING;
            case UNVERIFIED -> TransactionStatus.UNVERIFIED;
        };
        String message = outcome.message();
        // A paid amount that doesn't match what we asked for is never accepted as paid.
        if (outcome.paidAmount() != null && outcome.paidAmount().compareTo(t.getAmount()) != 0
                && (status == TransactionStatus.PAID || status == TransactionStatus.UNVERIFIED)) {
            status = TransactionStatus.UNVERIFIED;
            message = "Gateway reported " + outcome.paidAmount().toPlainString() + " " + t.getCurrency() + ", expected " + t.getAmount().toPlainString();
        }
        t.setProviderState(cipher.seal(state));
        if (status == TransactionStatus.PENDING) {
            t.setStatus(TransactionStatus.PENDING);
            t.setMessage(trim(message, 500));
            save(t);
        } else {
            finish(t, status, outcome.pgTransactionId(), outcome.bankTransactionId(), message);
        }
    }

    private void finish(GatewayTransaction t, TransactionStatus status, String pgTxn, String bankTxn, String message) {
        t.setStatus(status);
        if (pgTxn != null) t.setPgTransactionId(trim(pgTxn, 120));
        if (bankTxn != null) t.setBankTransactionId(trim(bankTxn, 120));
        t.setMessage(trim(message, 500));
        if (status.terminal()) t.setCompletedAt(LocalDateTime.now());
        save(t);
        log.info("Payment {} via {} is {}", t.getReference(), t.getGateway(), status);
    }

    private void save(GatewayTransaction t) {
        try { transactions.save(t); }
        catch (ObjectOptimisticLockingFailureException e) { log.info("Payment {} was updated concurrently; keeping the first result", t.getReference()); }
    }

    private GatewayContext context(GatewayTransaction t, Map<String, String> state) {
        GatewayAccount account = accounts.findById(t.getAccountId()).orElseThrow(() -> new GatewayException("The hotel's gateway account was removed"));
        return new GatewayContext(t.getId(), t.getHotelId(), t.getReference(), t.getAmount(), t.getCurrency(),
            t.getDescription() == null ? "Hotel booking" : t.getDescription(), t.getGuestName(), t.getGuestEmail(), t.getGuestPhone(),
            publicBaseUrl + "/api/v1/payment-gateway/public/callback/" + t.getId(),
            publicBaseUrl + "/api/v1/payment-gateway/public/notify/" + t.getGateway().name().toLowerCase(Locale.ROOT),
            Boolean.TRUE.equals(account.getTestMode()), new Credentials(cipher.open(account.getCredentials())), state);
    }

    /** Where the guest goes after a result was recorded. */
    public String returnUrl(GatewayTransaction t) { return returnTo(t); }

    private String returnTo(GatewayTransaction t) {
        String sep = t.getReturnUrl().contains("?") ? "&" : "?";
        return t.getReturnUrl() + sep + "payment=" + t.getId() + "&status=" + URLEncoder.encode(t.getStatus().name(), StandardCharsets.UTF_8);
    }

    public TransactionView view(GatewayTransaction t) {
        return new TransactionView(t.getId(), t.getReference(), t.getHotelId(), t.getGateway(), t.getAmount(), t.getCurrency(), t.getStatus(),
            t.getPurpose(), t.getExternalReference(), t.getPgTransactionId(), t.getMessage(), Boolean.TRUE.equals(t.getTestMode()),
            t.getCreatedAt(), t.getCompletedAt(), publicBaseUrl + "/api/v1/payment-gateway/public/pay/" + t.getId());
    }

    /** Alphanumeric and 18 characters: within every gateway's order-id limit. */
    private String newReference() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder b = new StringBuilder("AQ");
            for (int i = 0; i < 16; i++) b.append(REF_CHARS[random.nextInt(REF_CHARS.length)]);
            if (transactions.findByReference(b.toString()).isEmpty()) return b.toString();
        }
        throw new IllegalStateException("Could not allocate a payment reference");
    }

    static void validateReturnUrl(String url) {
        try {
            URI u = URI.create(url == null ? "" : url);
            boolean local = "http".equals(u.getScheme()) && ("localhost".equals(u.getHost()) || "127.0.0.1".equals(u.getHost()));
            if (!("https".equals(u.getScheme()) || local) || u.getHost() == null || u.getRawUserInfo() != null || url.length() > 1000)
                throw new GatewayException("returnUrl must be an https URL");
        } catch (IllegalArgumentException e) {
            throw new GatewayException("returnUrl must be an https URL");
        }
    }

    private static String trim(String s, int max) {
        if (s == null) return null;
        String v = s.strip();
        return v.isEmpty() ? null : v.substring(0, Math.min(v.length(), max));
    }
}
