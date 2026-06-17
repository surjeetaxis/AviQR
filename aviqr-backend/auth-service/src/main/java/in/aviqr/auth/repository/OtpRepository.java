package in.aviqr.auth.repository;

import in.aviqr.auth.entity.OtpRecord;
import in.aviqr.auth.entity.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface OtpRepository extends JpaRepository<OtpRecord, UUID> {
    Optional<OtpRecord> findByTargetAndOtpAndTypeAndUsedFalseAndExpiresAtAfter(
            String target, String otp, OtpType type, LocalDateTime now);
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
    long countByTargetAndCreatedAtAfter(String target, LocalDateTime after);
}
