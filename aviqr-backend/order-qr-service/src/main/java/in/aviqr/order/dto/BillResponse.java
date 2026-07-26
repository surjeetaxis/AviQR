package in.aviqr.order.dto;
import in.aviqr.order.entity.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BillResponse {
    UUID id; String shopId; String tableNumber; BillStatus status;
    BigDecimal subtotal; BigDecimal discount; BigDecimal serviceCharge; BigDecimal tax; BigDecimal totalAmount;
    PaymentMethod paymentMethod;
    LocalDateTime createdAt; String generatedBy;
    LocalDateTime paidAt; String settledBy;
    List<OrderResponse> orders;
}
