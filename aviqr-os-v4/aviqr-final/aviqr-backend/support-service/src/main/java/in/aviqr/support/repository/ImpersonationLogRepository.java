package in.aviqr.support.repository;
import in.aviqr.support.entity.ImpersonationLog;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ImpersonationLogRepository extends JpaRepository<ImpersonationLog, UUID> {
    Page<ImpersonationLog> findByAgentIdOrderByCreatedAtDesc(String agentId, Pageable p);
}