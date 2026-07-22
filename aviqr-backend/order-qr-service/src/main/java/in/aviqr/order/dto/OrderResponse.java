package in.aviqr.order.dto;
import in.aviqr.order.entity.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OrderResponse {
    UUID id; String orderNumber; String shopId;
    String customerId; String customerName; String customerPhone; String tableNumber;
    UUID hotelId; String roomNumber;
    OrderType type; OrderStatus status; PaymentMethod paymentMethod;
    PaymentStatus paymentStatus; String paymentId;
    BigDecimal subtotal; BigDecimal discount; BigDecimal serviceCharge; BigDecimal tax; BigDecimal totalAmount;
    String notes; List<ItemDto> items;
    String confirmationCode; LocalDateTime paymentConfirmedAt;
    LocalDateTime createdAt; LocalDateTime updatedAt;
    LocalDateTime acceptedAt; LocalDateTime completedAt;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ItemDto {
        UUID id; UUID menuItemId; String itemName; String variantName;
        Integer quantity; BigDecimal unitPrice; BigDecimal totalPrice; String notes;
        List<AddonDto> addons;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AddonDto {
        String name; BigDecimal price;
    }
}