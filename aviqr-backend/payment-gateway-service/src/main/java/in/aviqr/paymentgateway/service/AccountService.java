package in.aviqr.paymentgateway.service;

import in.aviqr.paymentgateway.entity.GatewayAccount;
import in.aviqr.paymentgateway.gateway.CredentialField;
import in.aviqr.paymentgateway.gateway.GatewayException;
import in.aviqr.paymentgateway.gateway.GatewayProvider;
import in.aviqr.paymentgateway.gateway.PaymentGateway;
import in.aviqr.paymentgateway.repository.GatewayAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/** Hotels' gateway accounts. Secret settings are write-only: reads say only whether one is set. */
@Service @RequiredArgsConstructor
public class AccountService {
    private final GatewayAccountRepository accounts;
    private final GatewayRegistry registry;
    private final CredentialCipher cipher;

    public record AccountView(UUID id, PaymentGateway gateway, String label, boolean testMode, boolean active, boolean preferred,
                              Map<String, String> settings, Set<String> secretsSet, String verification) { }

    public List<AccountView> list(UUID hotelId) {
        return accounts.findByHotelIdOrderByCreatedAtAsc(hotelId).stream().map(this::view).toList();
    }

    @Transactional
    public AccountView save(UUID hotelId, PaymentGateway gateway, Map<String, String> values, boolean testMode, boolean active) {
        GatewayProvider provider = registry.get(gateway);
        if (provider.unsupportedReason() != null) throw new GatewayException(provider.unsupportedReason());
        GatewayAccount account = accounts.findByHotelIdAndGateway(hotelId, gateway)
            .orElseGet(() -> GatewayAccount.builder().hotelId(hotelId).gateway(gateway).build());
        Map<String, String> stored = account.getCredentials() == null ? new LinkedHashMap<>() : cipher.open(account.getCredentials());
        Map<String, String> next = new LinkedHashMap<>();
        for (CredentialField f : provider.credentialFields()) {
            String supplied = values == null ? null : values.get(f.key());
            // A blank secret keeps the saved one, so staff can change other settings without re-entering it.
            String value = supplied != null && !supplied.isBlank() ? supplied.trim()
                : f.secret() ? stored.get(f.key()) : (supplied == null ? stored.get(f.key()) : null);
            if (value == null && f.defaultValue() != null) value = f.defaultValue();
            if (value != null && value.length() > 20_000) throw new GatewayException(f.label() + " is too long");
            if (f.required() && (value == null || value.isBlank())) throw new GatewayException(f.label() + " is required");
            if (value != null) next.put(f.key(), value);
        }
        account.setCredentials(cipher.seal(next));
        account.setTestMode(testMode);
        account.setActive(active);
        boolean first = accounts.findByHotelIdOrderByCreatedAtAsc(hotelId).stream().noneMatch(a -> Boolean.TRUE.equals(a.getPreferred()));
        if (first && active) account.setPreferred(true);
        return view(accounts.save(account));
    }

    @Transactional
    public void prefer(UUID hotelId, PaymentGateway gateway) {
        GatewayAccount chosen = accounts.findByHotelIdAndGateway(hotelId, gateway)
            .orElseThrow(() -> new GatewayException("Set up " + gateway + " first"));
        if (!Boolean.TRUE.equals(chosen.getActive())) throw new GatewayException("Turn this gateway on first");
        for (GatewayAccount a : accounts.findByHotelIdOrderByCreatedAtAsc(hotelId)) a.setPreferred(a.getId().equals(chosen.getId()));
    }

    @Transactional
    public void remove(UUID hotelId, PaymentGateway gateway) {
        accounts.findByHotelIdAndGateway(hotelId, gateway).ifPresent(accounts::delete);
    }

    /** The account guests pay through: the preferred active one, else the only active one. */
    public Optional<GatewayAccount> checkoutAccount(UUID hotelId, PaymentGateway requested) {
        List<GatewayAccount> active = accounts.findByHotelIdOrderByCreatedAtAsc(hotelId).stream()
            .filter(a -> Boolean.TRUE.equals(a.getActive()) && registry.get(a.getGateway()).unsupportedReason() == null).toList();
        if (requested != null) return active.stream().filter(a -> a.getGateway() == requested).findFirst();
        return active.stream().filter(a -> Boolean.TRUE.equals(a.getPreferred())).findFirst()
            .or(() -> active.size() == 1 ? Optional.of(active.get(0)) : Optional.empty());
    }

    private AccountView view(GatewayAccount a) {
        GatewayProvider p = registry.get(a.getGateway());
        Map<String, String> values = cipher.open(a.getCredentials());
        Map<String, String> settings = new LinkedHashMap<>();
        Set<String> secrets = new LinkedHashSet<>();
        for (CredentialField f : p.credentialFields()) {
            String v = values.get(f.key());
            if (f.secret()) { if (v != null && !v.isBlank()) secrets.add(f.key()); }
            else if (v != null) settings.put(f.key(), v);
        }
        return new AccountView(a.getId(), a.getGateway(), p.label(), Boolean.TRUE.equals(a.getTestMode()), Boolean.TRUE.equals(a.getActive()),
            Boolean.TRUE.equals(a.getPreferred()), settings, secrets, p.verification().name());
    }
}
