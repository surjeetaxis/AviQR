package in.aviqr.paymentgateway.service;

import in.aviqr.paymentgateway.entity.GatewayAccount;
import in.aviqr.paymentgateway.entity.GatewayTransaction;
import in.aviqr.paymentgateway.entity.TransactionStatus;
import in.aviqr.paymentgateway.gateway.*;
import in.aviqr.paymentgateway.repository.GatewayAccountRepository;
import in.aviqr.paymentgateway.repository.GatewayTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentServiceTest {
    final GatewayTransactionRepository transactions = mock(GatewayTransactionRepository.class);
    final GatewayAccountRepository accounts = mock(GatewayAccountRepository.class);
    final CredentialCipher cipher = new CredentialCipher(CredentialCipherTest.KEY);
    final UUID hotel = UUID.randomUUID();
    final GatewayAccount account = GatewayAccount.builder().id(UUID.randomUUID()).hotelId(hotel).gateway(PaymentGateway.RAZORPAY)
        .credentials(cipher.seal(Map.of("keyId", "k", "keySecret", "s"))).active(true).preferred(true).testMode(false).build();
    Outcome next = Outcome.paid("pay_1", null, new BigDecimal("1500.00"));
    PaymentService service;

    final GatewayProvider fake = new GatewayProvider() {
        public PaymentGateway gateway() { return PaymentGateway.RAZORPAY; }
        public String label() { return "Fake"; }
        public List<CredentialField> credentialFields() { return List.of(); }
        public Verification verification() { return Verification.SIGNED; }
        public Checkout begin(GatewayContext ctx) { ctx.state().put("seen", "yes"); return Checkout.form("https://pay.example/go", Map.of("ref", ctx.reference())); }
        public Outcome complete(GatewayContext ctx, Map<String, String> p) { return next; }
    };

    @BeforeEach
    void setUp() {
        GatewayRegistry registry = new GatewayRegistry(List.of(fake));
        when(accounts.findByHotelIdOrderByCreatedAtAsc(hotel)).thenReturn(List.of(account));
        when(accounts.findById(account.getId())).thenReturn(Optional.of(account));
        when(transactions.findByReference(any())).thenReturn(Optional.empty());
        when(transactions.save(any())).thenAnswer(i -> {
            GatewayTransaction t = i.getArgument(0);
            if (t.getId() == null) t.setId(UUID.randomUUID());
            when(transactions.findById(t.getId())).thenReturn(Optional.of(t));
            return t;
        });
        service = new PaymentService(transactions, accounts, new AccountService(accounts, registry, cipher), registry, cipher);
        ReflectionTestUtils.setField(service, "publicBaseUrl", "https://api.example");
    }

    PaymentService.TransactionView create() {
        return service.create(new PaymentService.CreateRequest(hotel, new BigDecimal("1500"), "inr", "BOOKING_DEPOSIT", "req-1",
            "Deposit", "https://book.example/stay?x=1", "Asha Rao", "asha@example.com", "+91 98765 43210", null));
    }

    @Test
    void createsAndHandsOffToTheGateway() {
        var t = create();
        assertThat(t.reference()).matches("AQ[A-Z2-9]{16}");
        assertThat(t.currency()).isEqualTo("INR");
        assertThat(t.payUrl()).isEqualTo("https://api.example/api/v1/payment-gateway/public/pay/" + t.id());
        String page = service.payPage(t.id());
        assertThat(page).contains("action=\"https://pay.example/go\"").contains(t.reference());
        assertThat(service.get(t.id()).orElseThrow().status()).isEqualTo(TransactionStatus.PENDING);
    }

    @Test
    void recordsPaymentAndRedirectsBack() {
        var t = create();
        String back = service.complete(t.id(), Map.of());
        assertThat(back).isEqualTo("https://book.example/stay?x=1&payment=" + t.id() + "&status=PAID");
        assertThat(service.get(t.id()).orElseThrow().pgTransactionId()).isEqualTo("pay_1");
    }

    @Test
    void aWrongAmountIsNeverPaid() {
        var t = create();
        next = Outcome.paid("pay_1", null, new BigDecimal("15.00"));
        service.complete(t.id(), Map.of());
        var after = service.get(t.id()).orElseThrow();
        assertThat(after.status()).isEqualTo(TransactionStatus.UNVERIFIED);
        assertThat(after.message()).contains("expected 1500.00");
    }

    @Test
    void aFinishedPaymentIgnoresLaterCallbacks() {
        var t = create();
        service.complete(t.id(), Map.of());
        next = Outcome.failed("late forged failure");
        service.complete(t.id(), Map.of());
        assertThat(service.get(t.id()).orElseThrow().status()).isEqualTo(TransactionStatus.PAID);
    }

    @Test
    void unverifiedSuccessWaitsForStaff() {
        var t = create();
        next = Outcome.unverified("x", "unsigned");
        service.complete(t.id(), Map.of());
        assertThat(service.get(t.id()).orElseThrow().status()).isEqualTo(TransactionStatus.UNVERIFIED);
        assertThat(service.resolve(t.id(), true, "staff-1").status()).isEqualTo(TransactionStatus.PAID);
    }

    @Test
    void rejectsUnsafeRequests() {
        assertThatThrownBy(() -> service.create(new PaymentService.CreateRequest(hotel, new BigDecimal("10"), "INR", null, null, null,
            "javascript:alert(1)", null, null, null, null))).isInstanceOf(GatewayException.class);
        assertThatThrownBy(() -> service.create(new PaymentService.CreateRequest(hotel, BigDecimal.ZERO, "INR", null, null, null,
            "https://ok.example", null, null, null, null))).isInstanceOf(GatewayException.class);
        assertThatThrownBy(() -> service.create(new PaymentService.CreateRequest(UUID.randomUUID(), BigDecimal.TEN, "INR", null, null, null,
            "https://ok.example", null, null, null, null))).hasMessageContaining("hasn't set up");
    }
}
