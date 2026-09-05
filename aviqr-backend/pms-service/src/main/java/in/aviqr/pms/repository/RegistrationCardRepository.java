package in.aviqr.pms.repository;

import in.aviqr.pms.entity.RegistrationCard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RegistrationCardRepository extends JpaRepository<RegistrationCard, UUID> {
    Optional<RegistrationCard> findByReservationId(UUID reservationId);
}
