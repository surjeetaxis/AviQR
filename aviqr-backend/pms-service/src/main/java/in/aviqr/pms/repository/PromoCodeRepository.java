package in.aviqr.pms.repository;

import in.aviqr.pms.entity.PromoCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromoCodeRepository extends JpaRepository<PromoCode, UUID> {
    Optional<PromoCode> findByHotelIdAndCodeIgnoreCase(UUID hotelId, String code);
    List<PromoCode> findByHotelIdOrderByCreatedAtDesc(UUID hotelId);

    /** Counts one use, unless the code is already used up; 0 rows means it was. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update PromoCode p set p.usedCount = coalesce(p.usedCount, 0) + 1 where p.id = :id and (p.maxUses is null or coalesce(p.usedCount, 0) < p.maxUses)")
    int use(@org.springframework.data.repository.query.Param("id") UUID id);
}
