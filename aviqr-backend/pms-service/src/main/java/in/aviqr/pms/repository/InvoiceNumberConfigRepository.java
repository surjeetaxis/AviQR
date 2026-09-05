package in.aviqr.pms.repository;

import in.aviqr.pms.entity.InvoiceNumberConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceNumberConfigRepository extends JpaRepository<InvoiceNumberConfig, UUID> {
    Optional<InvoiceNumberConfig> findByHotelId(UUID hotelId);
}
