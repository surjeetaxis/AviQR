package in.aviqr.menu.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dining_areas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiningArea {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private String shopId;
    @Column(nullable = false) private String name;
    @Builder.Default private Integer sortOrder = 0;
    @Builder.Default private Boolean active = true;
    @CreationTimestamp private LocalDateTime createdAt;
}
