package in.aviqr.paymentgateway.repository;

import in.aviqr.paymentgateway.entity.GatewayTransaction;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GatewayTransactionRepository extends JpaRepository<GatewayTransaction, UUID> {
    Optional<GatewayTransaction> findByReference(String reference);
    List<GatewayTransaction> findByHotelIdOrderByCreatedAtDesc(UUID hotelId, Pageable page);
}
