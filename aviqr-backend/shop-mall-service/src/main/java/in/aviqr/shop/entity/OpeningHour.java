package in.aviqr.shop.entity;
import jakarta.persistence.Embeddable;
import lombok.*;

@Embeddable @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OpeningHour {
    private String dayOfWeek;
    private boolean open;
    private String openTime;
    private String closeTime;
}