package in.aviqr.order.dto;
import in.aviqr.order.entity.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Data
public class OrderResponse {
    UUID id; String orderNumber; String shopId;
    String customerName; String customerPhone; String tableNumber;
    OrderType type; OrderStatus status; PaymentMethod paymentMethod;
    PaymentStatus paymentStatus; String paymentId;
    BigDecimal subtotal; BigDecimal tax; BigDecimal totalAmount;
    String notes; List<ItemDto> items;
    LocalDateTime createdAt; LocalDateTime updatedAt;

    @Data
    public static class ItemDto {
        UUID id; UUID menuItemId; String itemName;
        Integer quantity; BigDecimal unitPrice; BigDecimal totalPrice; String notes;
    }
}