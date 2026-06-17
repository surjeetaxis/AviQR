package in.aviqr.menu.entity;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Entity @Table(name="categories") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Category {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false) private String name;
    private String nameHi; private String nameTa; private String nameTe;
    private String nameKn; private String nameMl; private String nameBn;
    private String nameMr; private String nameGu;
    private String emoji;
    @Column(nullable=false) private String shopId;
    private Integer sortOrder;
    @Builder.Default private Boolean active = true;
}