package in.aviqr.payment.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class CreatePaymentOrderRequest {
    String orderId;
    BigDecimal amount;
    String currency;
    String shopId;
    String customerId;
}