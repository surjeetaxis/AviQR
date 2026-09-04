package in.aviqr.hotel.repository;

import in.aviqr.hotel.entity.GuestMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface GuestMessageRepository extends JpaRepository<GuestMessage, UUID> {
    List<GuestMessage> findByHotelIdAndRoomNumberOrderByCreatedAtAsc(UUID hotelId, String roomNumber);
    List<GuestMessage> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);

    // One row per room with its latest message — the staff inbox list.
    @Query("""
        select m from GuestMessage m
        where m.hotelId = :hotelId and m.createdAt = (
          select max(m2.createdAt) from GuestMessage m2
          where m2.hotelId = m.hotelId and m2.roomNumber = m.roomNumber
        )
        order by m.createdAt desc
        """)
    List<GuestMessage> latestPerRoom(@Param("hotelId") UUID hotelId);

    long countByHotelIdAndRoomNumberAndSenderAndReadByStaffFalse(UUID hotelId, String roomNumber, in.aviqr.hotel.entity.MessageSender sender);
}
