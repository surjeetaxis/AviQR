package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*; public interface HotelRepository extends JpaRepository<Hotel,UUID> { List<Hotel> findByOwnerId(String o); }