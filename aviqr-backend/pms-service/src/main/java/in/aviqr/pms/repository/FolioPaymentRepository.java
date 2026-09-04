package in.aviqr.pms.repository;

import in.aviqr.pms.dto.RevenueRow;
import in.aviqr.pms.entity.FolioPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface FolioPaymentRepository extends JpaRepository<FolioPayment, UUID> {
    List<FolioPayment> findByReservationIdOrderByCreatedAtAsc(UUID reservationId);
    List<FolioPayment> findByGroupIdOrderByCreatedAtAsc(UUID groupId);

    // Reservation-scoped payments only (a group organizer's consolidated payment
    // is attributed to the group, not a single stay, and is out of scope here).
    @Query("""
        select cast(fp.method as string) as label, sum(fp.amount) as amount
        from FolioPayment fp
        join Reservation r on r.id = fp.reservationId
        where r.hotelId = :hotelId and fp.createdAt between :from and :to
        group by fp.method
        order by sum(fp.amount) desc
        """)
    List<RevenueRow> revenueByPaymentMethod(@Param("hotelId") UUID hotelId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
