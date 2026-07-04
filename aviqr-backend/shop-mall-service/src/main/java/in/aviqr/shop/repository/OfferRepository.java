package in.aviqr.shop.repository;
import in.aviqr.shop.entity.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OfferRepository extends JpaRepository<Offer, UUID> {
    List<Offer> findByActiveTrue();
}
