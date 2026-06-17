package in.aviqr.order.dto;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateOrderRequest {
    @NotBlank String customerName;
    String customerPhone;
    String tableNumber;
    String type;
    @NotBlank String paymentMethod;
    String notes;
    @NotEmpty List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        @NotNull UUID menuItemId;
        @NotBlank String itemName;
        @Min(1) int quantity;
        @NotNull BigDecimal unitPrice;
        String notes;
    }
}