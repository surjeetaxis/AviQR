package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    Optional<Invoice> findByReservationId(UUID reservationId);
    List<Invoice> findByHotelIdOrderByIssuedAtDesc(UUID hotelId);
}
