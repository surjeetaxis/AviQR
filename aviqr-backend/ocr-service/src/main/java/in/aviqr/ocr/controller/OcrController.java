package in.aviqr.ocr.controller;
import in.aviqr.ocr.dto.ApiResponse;
import in.aviqr.ocr.entity.OcrJob;
import in.aviqr.ocr.repository.OcrJobRepository;
import in.aviqr.ocr.service.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController @RequestMapping("/api/v1/ocr") @RequiredArgsConstructor @Slf4j
public class OcrController {
    private final OcrJobRepository repo;
    private final OcrService       ocrService;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<OcrJob>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam String shopId,
            @RequestHeader("X-User-Id") String uid) {
        OcrJob job = ocrService.startJob(shopId, uid, file);
        return ResponseEntity.ok(ApiResponse.ok("OCR job started", job));
    }

    @GetMapping("/jobs/{id}")
    public ResponseEntity<ApiResponse<OcrJob>> getJob(@PathVariable String id) {
        return repo.findById(id)
            .map(j -> ResponseEntity.ok(ApiResponse.ok(j)))
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/jobs/shop/{shopId}")
    public ResponseEntity<ApiResponse<List<OcrJob>>> shopJobs(@PathVariable String shopId) {
        return ResponseEntity.ok(ApiResponse.ok(repo.findByShopIdOrderByCreatedAtDesc(shopId)));
    }

    @PostMapping("/jobs/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approve(@PathVariable String id,
                                                      @RequestHeader("X-User-Id") String uid) {
        ocrService.approveJob(id);
        return ResponseEntity.ok(ApiResponse.ok("Items sent to menu", null));
    }
}
