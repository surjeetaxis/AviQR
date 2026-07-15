package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "area_menu_prices", uniqueConstraints = @UniqueConstraint(columnNames = {"areaId", "menuItemId"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AreaMenuPrice {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private UUID areaId;
    @Column(nullable = false) private UUID menuItemId;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal price;
}
