package in.aviqr.menu.ocr;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection="ocr_jobs") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OcrJob {
    @Id private String id;
    private String shopId;
    private String fileUrl;
    private String fileType; // IMAGE, PDF
    private String status;   // PENDING, PROCESSING, COMPLETED, FAILED
    private String errorMessage;
    private List<ExtractedItem> extractedItems;
    private boolean ownerApproved;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ExtractedItem {
        String category; String name; String price; String description; double confidence;
    }
}