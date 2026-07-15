package in.aviqr.shop.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CustomerUpdateRequest {
    @NotBlank private String phone;
    private String name;
    private String email;
    private LocalDate birthday;
    private LocalDate anniversary;
}
