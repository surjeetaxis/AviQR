package in.aviqr.hotel.repository;
import in.aviqr.hotel.entity.HotelOutlet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface HotelOutletRepository extends JpaRepository<HotelOutlet, UUID> {
    List<HotelOutlet> findByHotelId(UUID hotelId);
    List<HotelOutlet> findByHotelIdAndActiveTrue(UUID hotelId);
}
