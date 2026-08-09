package in.aviqr.menu.media;

import in.aviqr.menu.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

// Generic file upload — menu item photos/videos/3D models, shop logos. Any
// authenticated user can upload; the resulting URL is only ever wired into a field
// (menu item / shop) whose own update endpoint already enforces the caller owns
// that shop. `kind` picks the size cap and content-type check — 3D models (.glb/
// .gltf) are checked by extension only since browsers report an unreliable/generic
// content-type for them.
@RestController @RequestMapping("/api/v1/media") @RequiredArgsConstructor @Slf4j
public class MediaController {

    private final S3Service s3Service;

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<UploadResult>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "misc") String folder,
            @RequestParam(defaultValue = "image") String kind,
            @RequestHeader("X-User-Id") String uid) {
        if (file.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error("File is empty"));

        String contentType = file.getContentType();
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";

        switch (kind) {
            case "video" -> {
                if (file.getSize() > 20L * 1024 * 1024) return ResponseEntity.badRequest().body(ApiResponse.error("Video must be under 20 MB"));
                if (contentType == null || !contentType.startsWith("video/"))
                    return ResponseEntity.badRequest().body(ApiResponse.error("Only video files are supported"));
            }
            case "model" -> {
                if (file.getSize() > 10L * 1024 * 1024) return ResponseEntity.badRequest().body(ApiResponse.error("3D model must be under 10 MB"));
                if (!name.endsWith(".glb") && !name.endsWith(".gltf"))
                    return ResponseEntity.badRequest().body(ApiResponse.error("Only .glb/.gltf files are supported"));
            }
            default -> {
                if (file.getSize() > 5L * 1024 * 1024) return ResponseEntity.badRequest().body(ApiResponse.error("Image must be under 5 MB"));
                if (contentType == null || !contentType.startsWith("image/"))
                    return ResponseEntity.badRequest().body(ApiResponse.error("Only image files are supported"));
            }
        }

        try {
            String url = s3Service.upload(file, folder);
            return ResponseEntity.ok(ApiResponse.ok("Uploaded", new UploadResult(url)));
        } catch (Exception e) {
            log.error("Media upload failed (uid={}, kind={}): {}", uid, kind, e.getMessage(), e);
            return ResponseEntity.status(502).body(ApiResponse.error("Upload failed — please try again"));
        }
    }

    public record UploadResult(String url) {}
}
