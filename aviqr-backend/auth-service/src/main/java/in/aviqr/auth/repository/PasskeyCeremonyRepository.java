package in.aviqr.auth.repository;
import in.aviqr.auth.entity.PasskeyCeremony;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface PasskeyCeremonyRepository extends JpaRepository<PasskeyCeremony,UUID> {
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 Optional<PasskeyCeremony> findByIdAndUserIdAndSessionIdAndUsedFalse(UUID id,UUID uid,UUID sid);
}
