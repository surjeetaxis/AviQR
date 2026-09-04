package in.aviqr.pms.repository;

import in.aviqr.pms.dto.RevenueRow;
import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.FolioChargeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface FolioChargeRepository extends JpaRepository<FolioCharge, UUID> {
    List<FolioCharge> findByReservationIdOrderByCreatedAtAsc(UUID reservationId);
    List<FolioCharge> findByReservationIdAndType(UUID reservationId, FolioChargeType type);
    boolean existsByExternalOrderId(String externalOrderId);

    @Query("""
        select rt.name as label, sum(fc.amount) as amount
        from FolioCharge fc
        join RoomReservation rr on rr.id = fc.roomReservationId
        join Reservation r on r.id = fc.reservationId
        join RoomType rt on rt.id = rr.roomTypeId
        where r.hotelId = :hotelId and fc.type = 'ROOM' and r.checkInDate between :from and :to
        group by rt.name
        order by sum(fc.amount) desc
        """)
    List<RevenueRow> revenueByRoomType(@Param("hotelId") UUID hotelId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("""
        select cast(r.source as string) as label, sum(fc.amount) as amount
        from FolioCharge fc
        join Reservation r on r.id = fc.reservationId
        where r.hotelId = :hotelId and r.checkInDate between :from and :to
        group by r.source
        order by sum(fc.amount) desc
        """)
    List<RevenueRow> revenueBySource(@Param("hotelId") UUID hotelId, @Param("from") LocalDate from, @Param("to") LocalDate to);
}
