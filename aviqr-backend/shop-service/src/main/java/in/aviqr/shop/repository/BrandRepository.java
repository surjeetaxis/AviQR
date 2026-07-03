package in.aviqr.shop.repository;
import in.aviqr.shop.entity.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface BrandRepository extends JpaRepository<Brand, UUID> {
    Optional<Brand> findByOwnerId(String ownerId);
}
