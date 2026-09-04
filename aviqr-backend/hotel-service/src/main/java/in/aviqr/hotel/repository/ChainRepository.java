package in.aviqr.hotel.repository;

import in.aviqr.hotel.entity.Chain;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChainRepository extends JpaRepository<Chain, UUID> {
    List<Chain> findByOwnerId(String ownerId);
}
