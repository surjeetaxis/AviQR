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
    private final LoginSecurityService security;
    private final in.aviqr.auth.repository.LoginSecurityRepository records;

    public void log(String action, String actorId, String description) {
        security.event("system@aviqr.internal","AUDIT_EVENT","RECORDED",action+": "+description,
            in.aviqr.auth.dto.DeviceInfo.builder().build(),actorId);
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
        return records.findByKindOrderByCreatedAtDesc("AUDIT_EVENT",pageable).map(record->{
            String description=record.getReason()==null?"":record.getReason();int separator=description.indexOf(": ");
            return AuditLog.builder().id(record.getId().toString()).action(separator<0?description:description.substring(0,separator))
                .actorId(record.getActorId()).description(separator<0?description:description.substring(separator+2))
                .service("auth-service").timestamp(record.getCreatedAt()).build();
        });
    }
}
