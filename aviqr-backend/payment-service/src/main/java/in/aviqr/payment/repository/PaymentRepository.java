package in.aviqr.payment.repository;
import in.aviqr.payment.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByPaymentId(String paymentId);
    Optional<Payment> findByOrderId(String orderId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Page<Payment> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
    Page<Payment> findByShopIdAndStatus(String shopId, PaymentStatus status, Pageable pageable);
    Page<Payment> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);
    Page<Payment> findAll(Pageable pageable);

    @Query("select distinct p.shopId from Payment p where p.status = :status and p.settlementId is null and p.paidAt < :cutoff")
    List<String> findShopIdsWithUnsettledPayments(@Param("status") PaymentStatus status, @Param("cutoff") LocalDateTime cutoff);

    List<Payment> findByShopIdAndStatusAndSettlementIdIsNullAndPaidAtBefore(
        String shopId, PaymentStatus status, LocalDateTime cutoff);

    List<Payment> findBySettlementIdOrderByPaidAtAsc(UUID settlementId);
}