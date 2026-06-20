package in.aviqr.auth.repository;

import in.aviqr.auth.entity.OtpRecord;
import in.aviqr.auth.entity.OtpType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface OtpRepository extends JpaRepository<OtpRecord, UUID> {
    // OTP is stored hashed (see AuthService#sendOtp), so it can't be matched by equality —
    // fetch live candidates and compare with PasswordEncoder#matches in the service layer.
    List<OtpRecord> findByTargetAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            String target, OtpType type, LocalDateTime now);
    void deleteByExpiresAtBefore(LocalDateTime cutoff);
    long countByTargetAndCreatedAtAfter(String target, LocalDateTime after);
}
