package in.aviqr.payment.repository;
import in.aviqr.payment.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByPaymentId(String paymentId);
    Optional<Payment> findByOrderId(String orderId);
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    Page<Payment> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
    Page<Payment> findByShopIdAndStatus(String shopId, PaymentStatus status, Pageable pageable);
    Page<Payment> findByCustomerIdOrderByCreatedAtDesc(String customerId, Pageable pageable);
    Page<Payment> findAll(Pageable pageable);
}