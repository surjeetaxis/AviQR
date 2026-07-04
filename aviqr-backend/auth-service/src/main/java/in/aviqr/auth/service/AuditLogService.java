package in.aviqr.auth.service;

import in.aviqr.auth.entity.AuditLog;
import in.aviqr.auth.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor @Slf4j
public class AuditLogService {

    private final AuditLogRepository repo;

    public void log(String action, String actorId, String description) {
        try {
            repo.save(AuditLog.builder()
                    .action(action)
                    .actorId(actorId)
                    .description(description)
                    .service("auth-service")
                    .timestamp(LocalDateTime.now())
                    .build());
        } catch (Exception e) {
            log.warn("Failed to write audit log: {}", e.getMessage());
        }
    }

    public Page<AuditLog> list(Pageable pageable) {
        return repo.findAllByOrderByTimestampDesc(pageable);
    }
}
