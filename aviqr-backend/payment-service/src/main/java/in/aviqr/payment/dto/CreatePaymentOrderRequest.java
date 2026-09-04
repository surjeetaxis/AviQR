package in.aviqr.payment.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreatePaymentOrderRequest {
    String orderId;
    /** "ORDER"/"BILL" (order-qr-service) or "PMS_FOLIO"/"PMS_PREAUTH" (pms-service, orderId=reservationId). */
    String targetType;
    BigDecimal amount;
    String currency;
    String shopId;
    String customerId;
    /** When true, creates the Razorpay order with payment_capture=0 — an auth-only
     *  hold that must be explicitly captured later (see /{paymentId}/capture) rather
     *  than settling immediately. Used for a card pre-authorization at check-in. */
    Boolean preAuth;
}