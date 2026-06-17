package in.aviqr.payment.dto;
import lombok.Data;

@Data
public class PaymentVerifyRequest {
    String razorpayOrderId;
    String razorpayPaymentId;
    String razorpaySignature;
    String orderId;
}