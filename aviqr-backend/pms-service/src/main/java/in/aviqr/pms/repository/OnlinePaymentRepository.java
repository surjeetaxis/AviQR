package in.aviqr.pms.repository;

import in.aviqr.pms.entity.OnlinePayment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OnlinePaymentRepository extends JpaRepository<OnlinePayment, UUID> {
    Optional<OnlinePayment> findByReservationId(UUID reservationId);
    List<OnlinePayment> findByStatusIn(Collection<String> statuses);
}
