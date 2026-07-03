package in.aviqr.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AddressRequest {
    @NotBlank
    String label;
    @NotBlank
    String line1;
    String line2;
    String city;
    String state;
    String pincode;
    String phone;
    // Lombok would otherwise generate isDefault()/setDefault(boolean), which Jackson
    // binds to JSON property "default" — force it to match the frontend's "isDefault".
    @JsonProperty("isDefault")
    boolean isDefault;
}