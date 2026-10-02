package in.aviqr.auth.repository;
import in.aviqr.auth.entity.PasskeyCredential;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface PasskeyRepository extends JpaRepository<PasskeyCredential,UUID> {
 List<PasskeyCredential> findByUserIdAndActiveTrue(UUID userId);
 @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
 Optional<PasskeyCredential> findByCredentialIdAndActiveTrue(String id);
 Optional<PasskeyCredential> findByIdAndUserId(UUID id,UUID uid);
}
