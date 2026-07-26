package in.aviqr.payment.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreatePaymentOrderRequest {
    String orderId;
    /** "ORDER" (default) or "BILL" — which order-qr-service entity {@code orderId} refers to. */
    String targetType;
    BigDecimal amount;
    String currency;
    String shopId;
    String customerId;
}