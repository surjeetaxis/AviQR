package in.aviqr.auth.service;
import in.aviqr.auth.entity.OtpType;
import in.aviqr.auth.repository.OtpRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
@Service @RequiredArgsConstructor
public class OtpVerificationService {
    private final OtpRepository records;
    private final PasswordEncoder encoder;
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public boolean verify(String email, OtpType type, String code) {
        var candidates = records.findByTargetAndTypeAndExpiresAtAfterOrderByCreatedAtDesc(email,type,LocalDateTime.now());
        if (candidates.isEmpty()) return false;
        var latest = candidates.get(0);
        if (Boolean.TRUE.equals(latest.getUsed()) || latest.getFailedAttempts() >= 5) return false;
        boolean valid = encoder.matches(code,latest.getOtp());
        if (valid) latest.setUsed(true);
        else { latest.setFailedAttempts(latest.getFailedAttempts()+1); if (Boolean.TRUE.equals(latest.getUsed()) || latest.getFailedAttempts() >= 5) latest.setUsed(true); }
        records.save(latest);
        return valid;
    }
}
