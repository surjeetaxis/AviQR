package in.aviqr.paymentgateway.repository;

import in.aviqr.paymentgateway.entity.GatewayAccount;
import in.aviqr.paymentgateway.gateway.PaymentGateway;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GatewayAccountRepository extends JpaRepository<GatewayAccount, UUID> {
    List<GatewayAccount> findByHotelIdOrderByCreatedAtAsc(UUID hotelId);
    Optional<GatewayAccount> findByHotelIdAndGateway(UUID hotelId, PaymentGateway gateway);
}
