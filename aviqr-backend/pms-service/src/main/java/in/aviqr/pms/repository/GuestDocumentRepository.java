package in.aviqr.pms.repository;

import in.aviqr.pms.entity.GuestDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface GuestDocumentRepository extends JpaRepository<GuestDocument, UUID> {
    interface Summary {
        UUID getId(); String getDocType(); String getContentType(); Integer getSizeBytes(); String getUploadedBy(); java.time.LocalDateTime getCreatedAt();
    }
    List<Summary> findByReservationIdOrderByCreatedAtAsc(UUID reservationId);

    /** Documents of stays that ended (checked out, cancelled or no-show) before the cutoff. */
    @Modifying
    @Query(value = """
        delete from pms_guest_documents d using pms_reservations r
        where r.id = d.reservation_id and r.status in ('CHECKED_OUT', 'CANCELLED', 'NO_SHOW') and r.check_out_date < :cutoff
        """, nativeQuery = true)
    int deleteForStaysEndedBefore(@Param("cutoff") LocalDate cutoff);
}
