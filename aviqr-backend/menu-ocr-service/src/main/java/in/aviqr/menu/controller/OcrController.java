package in.aviqr.menu.controller;
import in.aviqr.menu.dto.ApiResponse;
import in.aviqr.menu.ocr.OcrJob;
import in.aviqr.menu.ocr.OcrJobRepository;
import in.aviqr.menu.ocr.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        if ("OWNER".equals(role) && !callerShopId.isBlank() && !callerShopId.equals(shopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Shop mismatch"));
        OcrJob job = ocrService.startJob(shopId, uid, file);
        return ResponseEntity.ok(ApiResponse.ok("OCR job started", job));
    }

    // Admin/Support — all OCR jobs platform-wide (troubleshooting stuck/failed uploads)
    @GetMapping("/jobs/admin/all")
    public ResponseEntity<ApiResponse<Page<OcrJob>>> adminAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(
            repo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
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
    public ResponseEntity<ApiResponse<Void>> approve(
            @PathVariable String id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-Shop-Id", defaultValue = "") String callerShopId) {
        OcrJob job = repo.findById(id).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();
        if ("OWNER".equals(role) && !callerShopId.isBlank() && !callerShopId.equals(job.getShopId()))
            return ResponseEntity.status(403).body(ApiResponse.error("Shop mismatch"));
        ocrService.approveJob(id);
        return ResponseEntity.ok(ApiResponse.ok("Items sent to menu", null));
    }
}
