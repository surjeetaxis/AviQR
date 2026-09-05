package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface GuestRepository extends JpaRepository<Guest, UUID> {
    List<Guest> findByHotelIdAndPhone(UUID hotelId, String phone);
    List<Guest> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);

    @Query("""
        select g from Guest g where g.hotelId = :hotelId
          and (lower(g.name) like lower(concat('%', :q, '%')) or g.phone like concat('%', :q, '%'))
        """)
    List<Guest> search(@Param("hotelId") UUID hotelId, @Param("q") String q);
}
