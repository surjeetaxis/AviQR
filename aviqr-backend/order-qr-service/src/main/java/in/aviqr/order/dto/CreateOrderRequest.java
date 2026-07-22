package in.aviqr.order.dto;
import jakarta.validation.Valid;
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
    UUID hotelId;      // required when paymentMethod=ROOM_CHARGE
    String roomNumber; // required when paymentMethod=ROOM_CHARGE
    String type;
    @NotBlank String paymentMethod;
    String notes;
    @DecimalMin(value = "0", message = "Discount cannot be negative") BigDecimal discount;
    @DecimalMin(value = "0", message = "Service charge cannot be negative") BigDecimal serviceCharge;
    @NotEmpty @Valid List<OrderItemRequest> items;

    @Data
    public static class OrderItemRequest {
        @NotNull UUID menuItemId;
        @NotBlank String itemName;
        String variantName; // e.g. "Large" — informational; unitPrice must already reflect it
        @Min(1) int quantity;
        @NotNull @DecimalMin(value = "0.01", message = "Unit price must be positive") BigDecimal unitPrice;
        String notes;
        @Valid List<AddonSelectionRequest> addons;
    }

    @Data
    public static class AddonSelectionRequest {
        @NotBlank String name;
        @NotNull @DecimalMin(value = "0", message = "Add-on price cannot be negative") BigDecimal price;
    }
}