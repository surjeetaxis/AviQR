package in.aviqr.pms.repository;

import in.aviqr.pms.entity.CommissionStatus;
import in.aviqr.pms.entity.ReservationCommission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservationCommissionRepository extends JpaRepository<ReservationCommission, UUID> {
    Optional<ReservationCommission> findByReservationId(UUID reservationId);
    List<ReservationCommission> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
    List<ReservationCommission> findByHotelIdAndStatusOrderByCreatedAtDesc(UUID hotelId, CommissionStatus status);
    List<ReservationCommission> findByAgentIdOrderByCreatedAtDesc(UUID agentId);
}
