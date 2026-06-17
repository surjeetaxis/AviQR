package in.aviqr.ocr.controller;
import in.aviqr.ocr.dto.ApiResponse;
import in.aviqr.ocr.entity.OcrJob;
import in.aviqr.ocr.repository.OcrJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/v1/ocr") @RequiredArgsConstructor @Slf4j
public class OcrController {
    private final OcrJobRepository repo;
    private final RabbitTemplate rabbit;

    // Upload menu image/PDF for OCR extraction
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<OcrJob>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam String shopId,
            @RequestHeader("X-User-Id") String uid) {

        String fileType = file.getContentType() != null && file.getContentType().contains("pdf") ? "PDF" : "IMAGE";

        // In production: upload to S3/GCS and call Google Vision API or Tesseract
        OcrJob job = OcrJob.builder()
            .shopId(shopId)
            .fileUrl("https://storage.aviqr.in/ocr/" + UUID.randomUUID() + "-" + file.getOriginalFilename())
            .fileType(fileType)
            .status("PROCESSING")
            .createdAt(LocalDateTime.now())
            .build();
        job = repo.save(job);

        final String jobId = job.getId();
        // Simulate async OCR processing
        new Thread(() -> {
            try {
                Thread.sleep(3000);
                repo.findById(jobId).ifPresent(j -> {
                    j.setStatus("COMPLETED");
                    j.setCompletedAt(LocalDateTime.now());
                    j.setExtractedItems(List.of(
                        new OcrJob.ExtractedItem("Starters", "Paneer Tikka", "280", "Grilled cottage cheese", 0.94),
                        new OcrJob.ExtractedItem("Starters", "Samosa", "60", "Potato filled pastry", 0.91),
                        new OcrJob.ExtractedItem("Mains", "Paneer Butter Masala", "320", "Rich tomato gravy", 0.96),
                        new OcrJob.ExtractedItem("Drinks", "Masala Chai", "30", "Spiced tea", 0.89)
                    ));
                    repo.save(j);
                });
            } catch (Exception e) { log.error("OCR processing failed", e); }
        }).start();

        return ResponseEntity.ok(ApiResponse.ok("OCR job started", job));
    }

    // Get OCR job status
    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<OcrJob>> getJob(@PathVariable String id) {
        return repo.findById(id)
            .map(j -> ResponseEntity.ok(ApiResponse.ok(j)))
            .orElse(ResponseEntity.notFound().build());
    }

    // Get all jobs for a shop
    @GetMapping("/jobs/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<OcrJob>>> shopJobs(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(repo.findByShopIdOrderByCreatedAtDesc(shopId)));
    }

    // Owner approves OCR result — publishes items to menu service
    @PostMapping("/jobs/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approve(@PathVariable String id, @RequestHeader("X-User-Id") String uid) {
        repo.findById(id).ifPresent(j -> {
            j.setOwnerApproved(true);
            repo.save(j);
            // Publish to menu service via RabbitMQ
            try {
                rabbit.convertAndSend("aviqr.ocr", "menu.items.approved",
                    Map.of("jobId", id, "shopId", j.getShopId(), "items", j.getExtractedItems()));
            } catch (Exception e) { log.warn("Failed to publish OCR approval event", e); }
        });
        return ResponseEntity.ok(ApiResponse.ok("Items sent to menu", null));
    }
}