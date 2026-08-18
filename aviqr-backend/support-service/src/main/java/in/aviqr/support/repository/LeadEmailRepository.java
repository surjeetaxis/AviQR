package in.aviqr.support.repository;
import in.aviqr.support.entity.LeadEmail;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface LeadEmailRepository extends JpaRepository<LeadEmail, UUID> {
    List<LeadEmail> findByLeadIdOrderByCreatedAtDesc(UUID leadId);
    // Guards the scheduler against piling a new auto-draft on top of one
    // nobody has reviewed yet — whether that pending draft is auto-generated
    // or something a staff member already started writing by hand.
    boolean existsByLeadIdAndStatus(UUID leadId, in.aviqr.support.entity.LeadEmailStatus status);
}
