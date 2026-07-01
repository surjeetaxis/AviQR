package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class HotelOutletController {
    private final HotelOutletRepository outletRepo;
    private final HotelAccessService accessService;
    private final RabbitTemplate rabbit;

    @Value("${qr.service.url:http://qr-service}")
    private String qrServiceUrl;

    @PostMapping("/api/v1/hotel-outlets")
    public ResponseEntity<ApiResponse<HotelOutlet>> create(
            @RequestBody HotelOutlet outlet,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(outlet.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (outlet.getBookable() == null) {
            outlet.setBookable(outlet.getOutletType() == OutletType.SPA
                || outlet.getOutletType() == OutletType.ACTIVITY
                || outlet.getOutletType() == OutletType.BANQUET);
        }
        HotelOutlet saved = outletRepo.save(outlet);
        try {
            rabbit.convertAndSend("aviqr.hotel", "outlet.new",
                Map.of("outletId", saved.getId().toString(), "hotelId", saved.getHotelId().toString(),
                       "name", saved.getName(), "outletType", saved.getOutletType().name()));
        } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok("Created", saved));
    }

    @GetMapping("/api/v1/hotel-outlets/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<HotelOutlet>>> getOutlets(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(outletRepo.findByHotelId(hotelId)));
    }

    @GetMapping("/api/v1/hotel-outlets/public/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<HotelOutlet>>> publicOutlets(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(outletRepo.findByHotelIdAndActiveTrue(hotelId)));
    }

    @PutMapping("/api/v1/hotel-outlets/{id}/status")
    public ResponseEntity<ApiResponse<Void>> toggleStatus(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return outletRepo.findById(id).map(o -> {
            if (!accessService.hasAccess(o.getHotelId(), uid, role))
                return ResponseEntity.status(403).<ApiResponse<Void>>body(ApiResponse.error("Forbidden"));
            o.setActive(active); outletRepo.save(o);
            return ResponseEntity.ok(ApiResponse.ok("Updated", (Void) null));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/hotel-outlets/{id}/qr")
    public ResponseEntity<ApiResponse<Void>> toggleQr(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return outletRepo.findById(id).map(o -> {
            if (!accessService.hasAccess(o.getHotelId(), uid, role))
                return ResponseEntity.status(403).<ApiResponse<Void>>body(ApiResponse.error("Forbidden"));
            o.setQrActive(active); outletRepo.save(o);
            return ResponseEntity.ok(ApiResponse.ok("Updated", (Void) null));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/api/v1/hotel-outlets/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return outletRepo.findById(id).map(o -> {
            if (!accessService.hasAccess(o.getHotelId(), uid, role))
                return ResponseEntity.status(403).<ApiResponse<Void>>body(ApiResponse.error("Forbidden"));
            outletRepo.delete(o);
            return ResponseEntity.ok(ApiResponse.ok("Deleted", (Void) null));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Convenience: QR-enable an outlet in one call instead of the frontend orchestrating hotel-service + qr-service.
    @PostMapping("/api/v1/hotel-outlets/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        HotelOutlet outlet = outletRepo.findById(id).orElse(null);
        if (outlet == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(outlet.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (outlet.getShopId() == null || outlet.getShopId().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Outlet has no linked shop"));
        try {
            RestTemplate rt = new RestTemplate();
            String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + outlet.getShopId()
                + "?label=" + outlet.getName() + "&type=HOTEL_OUTLET&group=" + outlet.getHotelId();
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = rt.postForObject(url, null, Map.class);
            return ResponseEntity.ok(ApiResponse.ok("QR created", resp));
        } catch (Exception e) {
            log.warn("Failed to create QR for outlet {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }
}
