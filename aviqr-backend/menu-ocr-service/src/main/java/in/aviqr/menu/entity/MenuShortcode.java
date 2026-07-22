package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "menu_shortcodes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MenuShortcode {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private String shopId;
    @Column(nullable = false, length = 10) private String code;
    @Column(nullable = false) private UUID menuItemId;
    private UUID variantId;
    @Builder.Default private Boolean active = true;
    @Builder.Default private Integer sortOrder = 0;
    @CreationTimestamp private LocalDateTime createdAt;
}