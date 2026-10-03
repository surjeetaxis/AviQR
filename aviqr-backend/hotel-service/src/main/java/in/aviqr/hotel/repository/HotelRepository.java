package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param; public interface HotelRepository extends JpaRepository<Hotel,UUID> { List<Hotel> findByOwnerId(String o); List<Hotel> findByChainId(UUID chainId);
 @Query("select h from Hotel h where h.active = true and (:city = '' or lower(coalesce(h.city,'')) = lower(:city)) and (:q = '' or lower(h.name) like lower(concat('%', :q, '%')) or lower(coalesce(h.city,'')) like lower(concat('%', :q, '%')) or lower(coalesce(h.address,'')) like lower(concat('%', :q, '%')))")
 Page<Hotel> searchPublicProperties(@Param("q") String q, @Param("city") String city, Pageable pageable);
}