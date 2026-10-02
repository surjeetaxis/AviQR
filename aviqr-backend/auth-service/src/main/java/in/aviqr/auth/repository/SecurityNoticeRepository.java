package in.aviqr.auth.repository;
import in.aviqr.auth.entity.SecurityNotice;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.Pageable;
import java.util.*;
import java.time.LocalDateTime;
public interface SecurityNoticeRepository extends JpaRepository<SecurityNotice,UUID> {
 @Query(value="SELECT * FROM security_notice_outbox WHERE sent_at IS NULL AND attempts < 20 AND next_attempt_at <= :now ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED",nativeQuery=true)
 List<SecurityNotice> pending(@org.springframework.data.repository.query.Param("now") LocalDateTime now);
}
