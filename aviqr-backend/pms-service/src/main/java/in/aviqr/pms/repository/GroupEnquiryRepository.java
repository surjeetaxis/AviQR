package in.aviqr.pms.repository;

import in.aviqr.pms.entity.GroupEnquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GroupEnquiryRepository extends JpaRepository<GroupEnquiry, UUID> {
    List<GroupEnquiry> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);
}
