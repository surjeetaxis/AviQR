package in.aviqr.menu.media;

import in.aviqr.menu.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Set;

// Generic file upload — menu item photos/videos/3D models, shop logos, room tour media.
// The resulting URL is only ever wired into a field (menu item / shop / room) whose own
// update endpoint enforces that the caller owns it, so this endpoint only needs to keep
// out roles that never manage media and make sure the stored object is what it claims
// to be. `kind` picks the size cap and the allowed types; the type is read from the
// file's first bytes (UploadType), never from the browser's Content-Type or filename.
@RestController @RequestMapping("/api/v1/media") @RequiredArgsConstructor @Slf4j
public class MediaController {

    private final S3Service s3Service;

    // Customers and floor staff (cashier, kitchen, order viewer) never upload media.
    private static final Set<String> UPLOAD_ROLES = Set.of(
        "OWNER", "MANAGER", "MENU_EDITOR", "HOTEL", "MALL", "SUPPLIER", "ADMIN", "SUPPORT");

    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<UploadResult>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "misc") String folder,
            @RequestParam(defaultValue = "image") String kind,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!UPLOAD_ROLES.contains(role)) return ResponseEntity.status(403).body(ApiResponse.error("Your role cannot upload media"));
        if (file.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error("File is empty"));

        long limit = switch (kind) {
            case "video", "panorama" -> 20L * 1024 * 1024;
            case "model" -> 10L * 1024 * 1024;
            default -> 5L * 1024 * 1024;
        };
        if (file.getSize() > limit)
            return ResponseEntity.badRequest().body(ApiResponse.error("File must be under " + (limit / (1024 * 1024)) + " MB"));

        byte[] head;
        try (var in = file.getInputStream()) { head = in.readNBytes(UploadType.HEADER_BYTES); }
        catch (Exception e) { return ResponseEntity.badRequest().body(ApiResponse.error("Could not read the file")); }

        var type = UploadType.detect(head, kind);
        if (type.isEmpty()) return ResponseEntity.badRequest().body(ApiResponse.error(switch (kind) {
            case "video" -> "Only MP4, MOV or WebM videos are supported";
            case "panorama" -> "360° photos must be JPEG, PNG or WebP";
            case "model" -> "Only .glb/.gltf files are supported";
            default -> "Only JPEG, PNG, WebP or GIF images are supported";
        }));

        try {
            String url = s3Service.upload(file, folder, type.get());
            return ResponseEntity.ok(ApiResponse.ok("Uploaded", new UploadResult(url)));
        } catch (Exception e) {
            log.error("Media upload failed (uid={}, kind={}): {}", uid, kind, e.getMessage(), e);
            return ResponseEntity.status(502).body(ApiResponse.error("Upload failed — please try again"));
        }
    }

    public record UploadResult(String url) {}
}
