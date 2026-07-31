package in.aviqr.auth.repository;

import in.aviqr.auth.entity.RefreshToken;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);

    Optional<RefreshToken> findByIdAndUserId(UUID id, UUID userId);

    Page<RefreshToken> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    @Transactional
    void deleteByUserId(UUID userId);

    // Fix: Spring Data cannot derive "revoke" — use explicit @Modifying @Query instead
    @Transactional
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true WHERE r.userId = :userId")
    void revokeAllByUserId(@Param("userId") UUID userId);

    @Transactional
    @Modifying
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedAt = :now, r.revokedBy = :revokedBy WHERE r.userId = :userId")
    void revokeAllByUserId(@Param("userId") UUID userId, @Param("revokedBy") String revokedBy, @Param("now") LocalDateTime now);
}
