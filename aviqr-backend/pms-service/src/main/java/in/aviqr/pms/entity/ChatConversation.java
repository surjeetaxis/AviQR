package in.aviqr.pms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/** A WhatsApp guest's recent chat with the booking assistant; turns are JSON, at most the last 20. */
@Entity @Table(name="pms_chat_conversations", uniqueConstraints=@UniqueConstraint(columnNames={"hotel_id","contact"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatConversation {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="hotel_id", nullable=false) private UUID hotelId;
    /** The guest's WhatsApp number. */
    @Column(nullable=false, length=32) private String contact;
    @Column(columnDefinition="text") private String turns;
    private LocalDateTime updatedAt;
}
