package in.aviqr.auth.service;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
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
}

@Document(collection = "audit_logs")
@Getter @Setter @Builder
class AuditLog {
    @Id String id;
    String action;
    String actorId;
    String description;
    String service;
    LocalDateTime timestamp;
}

@Repository
interface AuditLogRepository extends MongoRepository<AuditLog, String> {}
