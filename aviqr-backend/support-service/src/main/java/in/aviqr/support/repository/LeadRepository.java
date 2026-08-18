package in.aviqr.support.repository;
import in.aviqr.support.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID> {
    Page<Lead> findByStatus(LeadStatus s, Pageable p);
    Page<Lead> findByAssignedTo(String assignedTo, Pageable p);
    @Query("SELECT l FROM Lead l WHERE LOWER(l.businessName) LIKE LOWER(CONCAT('%',:q,'%')) OR LOWER(l.city) LIKE LOWER(CONCAT('%',:q,'%'))")
    Page<Lead> search(String q, Pageable p);
    long countByStatus(LeadStatus s);

    // Candidates for LeadFollowUpScheduler, one stage at a time: contacted,
    // sitting at exactly this follow-up stage, gone quiet since before the
    // cutoff for that stage. Each stage has its own required quiet period
    // (measured from the most recent contact, not cumulatively from the
    // first), so the scheduler calls this once per stage with a different cutoff.
    List<Lead> findByStatusAndFollowUpStageAndLastContactedAtBefore(
        LeadStatus status, int followUpStage, LocalDateTime cutoff);
}
