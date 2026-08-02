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
        @Builder.Default Boolean veg = true;
        // Mirror the fields MenuItem actually persists (see MenuItem entity) so the owner
        // can edit a scanned item in the exact same modal used for a normal menu item and
        // have every field they touch survive into the created MenuItem on approval.
        @Builder.Default Boolean spicy = false;
        @Builder.Default Boolean popular = false;
        String imageUrl; String videoUrl; String modelUrl;
        @Builder.Default String mediaType = "NONE";
        String nameHi; String nameTa; String nameTe;

        // Kept alongside @Builder rather than replaced by @AllArgsConstructor so every
        // existing 5-arg call site (Vision-parsed items, mock items) didn't need touching
        // when new fields were added — those calls all mean "just the OCR-guessed basics".
        public ExtractedItem(String category, String name, String price, String description, double confidence) {
            this.category = category; this.name = name; this.price = price;
            this.description = description; this.confidence = confidence;
            this.veg = true; this.spicy = false; this.popular = false; this.mediaType = "NONE";
        }
    }
}