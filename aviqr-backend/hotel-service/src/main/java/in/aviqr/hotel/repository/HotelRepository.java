package in.aviqr.hotel.repository;

import in.aviqr.hotel.entity.Hotel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface HotelRepository extends JpaRepository<Hotel,UUID> {
    List<Hotel> findByOwnerId(String ownerId);
    List<Hotel> findByChainId(UUID chainId);
    Optional<Hotel> findFirstByBookingEngineSlugIgnoreCase(String slug);
    Optional<Hotel> findFirstByBookingEngineCustomDomainIgnoreCase(String domain);
    boolean existsByBookingEngineSlugIgnoreCaseAndIdNot(String slug, UUID id);
    boolean existsByBookingEngineCustomDomainIgnoreCaseAndIdNot(String domain, UUID id);

    @Query("select h from Hotel h where h.active = true and h.bookingEngineEnabled = true " +
        "and h.bookingEngineVisibility = in.aviqr.hotel.entity.BookingEngineVisibility.PUBLIC " +
        "and (:city = '' or lower(coalesce(h.city,'')) = lower(:city)) " +
        "and (:q = '' or lower(h.name) like lower(concat('%', :q, '%')) " +
        "or lower(coalesce(h.city,'')) like lower(concat('%', :q, '%')) " +
        "or lower(coalesce(h.address,'')) like lower(concat('%', :q, '%'))) ")
    Page<Hotel> searchPublicProperties(@Param("q") String q, @Param("city") String city, Pageable pageable);
}
