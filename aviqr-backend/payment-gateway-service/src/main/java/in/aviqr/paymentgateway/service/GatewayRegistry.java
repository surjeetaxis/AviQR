package in.aviqr.paymentgateway.service;

import in.aviqr.paymentgateway.gateway.GatewayException;
import in.aviqr.paymentgateway.gateway.GatewayProvider;
import in.aviqr.paymentgateway.gateway.PaymentGateway;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class GatewayRegistry {
    private final Map<PaymentGateway, GatewayProvider> providers = new EnumMap<>(PaymentGateway.class);

    public GatewayRegistry(List<GatewayProvider> all) {
        for (GatewayProvider p : all)
            if (providers.put(p.gateway(), p) != null) throw new IllegalStateException("Two providers for " + p.gateway());
    }

    public GatewayProvider get(PaymentGateway gateway) {
        GatewayProvider p = providers.get(gateway);
        if (p == null) throw new GatewayException(gateway + " isn't available");
        return p;
    }

    public Collection<GatewayProvider> all() { return providers.values(); }
}
