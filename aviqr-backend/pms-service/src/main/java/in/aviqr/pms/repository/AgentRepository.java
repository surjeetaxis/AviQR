package in.aviqr.pms.repository;

import in.aviqr.pms.entity.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AgentRepository extends JpaRepository<Agent, UUID> {
    List<Agent> findByHotelId(UUID hotelId);
    List<Agent> findByHotelIdAndActiveTrue(UUID hotelId);
}
