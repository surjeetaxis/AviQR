package in.aviqr.qr.controller;
import in.aviqr.qr.dto.ApiResponse;
import in.aviqr.qr.entity.*;
import in.aviqr.qr.service.QrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1/qr-codes") @RequiredArgsConstructor
public class QrController {
    private final QrService service;

    private boolean canManageShop(String role, String callerShopId, String resourceShopId) {
        if ("ADMIN".equals(role)) return true;
        return resourceShopId != null && resourceShopId.equals(callerShopId)
            && java.util.Set.of("OWNER", "MANAGER").contains(role);
    }

    @PostMapping("/shop/{shopId}")
    public ResponseEntity<?> create(
            @PathVariable String shopId,
            @RequestParam(defaultValue="Main QR") String label,
            @RequestParam(defaultValue="SHOP") String type,
            @RequestParam(required=false) String group,
            @RequestHeader("X-User-Role") String role,
            @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, shopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("QR created",
            service.create(shopId, label, QrType.valueOf(type.toUpperCase()), group)));
    }

    @GetMapping("/shop/{shopId}")
    public ResponseEntity<?> getByShop(@PathVariable String shopId,
                                        @RequestHeader("X-User-Role") String role,
                                        @RequestHeader(value="X-Shop-Id", required=false) String callerShopId) {
        if (!canManageShop(role, callerShopId, shopId))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(service.getByShop(shopId)));
    }

    // Redirect — called when customer scans QR
    @GetMapping("/r/{code}")
    public ResponseEntity<Void> redirect(
            @PathVariable String code,
            @RequestHeader(value="X-Forwarded-For", required=false) String ip,
            @RequestHeader(value="User-Agent", required=false) String ua) {
        String url = service.resolveAndTrack(code, ip, ua);
        return ResponseEntity.status(HttpStatus.FOUND)
            .header(HttpHeaders.LOCATION, url)
            .build();
    }

    // Download QR as PNG
    @GetMapping("/{code}/image")
    public ResponseEntity<byte[]> getImage(@PathVariable String code) throws Exception {
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_PNG)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=qr-" + code + ".png")
            .body(service.generateQrImage(code));
    }
}