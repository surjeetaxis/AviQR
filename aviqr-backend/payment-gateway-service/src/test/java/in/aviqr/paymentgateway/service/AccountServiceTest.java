package in.aviqr.paymentgateway.service;

import in.aviqr.paymentgateway.entity.GatewayAccount;
import in.aviqr.paymentgateway.gateway.GatewayException;
import in.aviqr.paymentgateway.gateway.PaymentGateway;
import in.aviqr.paymentgateway.gateway.providers.*;
import in.aviqr.paymentgateway.repository.GatewayAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AccountServiceTest {
    final GatewayAccountRepository repo = mock(GatewayAccountRepository.class);
    final CredentialCipher cipher = new CredentialCipher(CredentialCipherTest.KEY);
    final AccountService service = new AccountService(repo,
        new GatewayRegistry(List.of(new RazorpayProvider(RestClient.create()), new AgodaPayProvider())), cipher);
    final UUID hotel = UUID.randomUUID();
    GatewayAccount stored;

    AccountServiceTest() {
        when(repo.save(any())).thenAnswer(i -> { stored = i.getArgument(0); if (stored.getId() == null) stored.setId(UUID.randomUUID()); return stored; });
        when(repo.findByHotelIdAndGateway(hotel, PaymentGateway.RAZORPAY)).thenAnswer(i -> Optional.ofNullable(stored));
        when(repo.findByHotelIdOrderByCreatedAtAsc(hotel)).thenAnswer(i -> stored == null ? List.of() : List.of(stored));
    }

    @Test
    void secretsAreWriteOnlyAndKeptWhenLeftBlank() {
        var v = service.save(hotel, PaymentGateway.RAZORPAY, Map.of("keyId", "rzp_live_1", "keySecret", "topsecret"), false, true);
        assertThat(v.settings()).containsEntry("keyId", "rzp_live_1").doesNotContainKey("keySecret");
        assertThat(v.secretsSet()).containsExactly("keySecret");
        assertThat(v.preferred()).isTrue();
        service.save(hotel, PaymentGateway.RAZORPAY, Map.of("keyId", "rzp_live_2", "keySecret", ""), true, true);
        assertThat(cipher.open(stored.getCredentials())).containsEntry("keyId", "rzp_live_2").containsEntry("keySecret", "topsecret");
    }

    @Test
    void requiredSettingsAndUnsupportedGateways() {
        assertThatThrownBy(() -> service.save(hotel, PaymentGateway.RAZORPAY, Map.of("keyId", "x"), false, true))
            .isInstanceOf(GatewayException.class).hasMessageContaining("Key secret");
        assertThatThrownBy(() -> service.save(hotel, PaymentGateway.AGODAPAY, Map.of(), false, true))
            .hasMessageContaining("gateway-hosted");
    }
}
