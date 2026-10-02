package in.aviqr.auth.repository;
import in.aviqr.auth.entity.LoginSecurityRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.*;
public interface LoginSecurityRepository extends JpaRepository<LoginSecurityRecord, UUID> {
    Page<LoginSecurityRecord> findByKindOrderByCreatedAtDesc(String kind, Pageable pageable);
    Optional<LoginSecurityRecord> findFirstByEmailAndKindOrderByCreatedAtDesc(String email, String kind);
    long countByEmailAndKindAndCreatedAtAfter(String email, String kind, LocalDateTime after);
    long countByIpAddressAndKindAndCreatedAtAfter(String ip, String kind, LocalDateTime after);
    boolean existsByEmailAndKindAndStatusAndExpiresAtAfter(String email, String kind, String status, LocalDateTime now);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<LoginSecurityRecord> findByTokenHashAndKindAndStatusAndExpiresAtAfter(String hash, String kind, String status, LocalDateTime now);
    List<LoginSecurityRecord> findByUserIdAndKindAndStatus(UUID userId, String kind, String status);
}
