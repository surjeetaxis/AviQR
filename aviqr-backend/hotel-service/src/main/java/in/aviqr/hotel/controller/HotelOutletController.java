package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.security.OutletTokenService;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class HotelOutletController {
    private final HotelOutletRepository outletRepo;
    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final HotelAccessService accessService;
    private final RabbitTemplate rabbit;
    private final RestTemplate restTemplate;
    private final OutletTokenService outletTokenService;

    @Value("${qr.service.url:http://order-qr-service}")
    private String qrServiceUrl;

    @Value("${shop.service.url:http://shop-mall-service}")
    private String shopServiceUrl;

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
        if (outlet.getShopId() == null || outlet.getShopId().isBlank()) {
            String provisionedShopId = provisionShop(outlet, uid);
            if (provisionedShopId == null)
                return ResponseEntity.status(502).body(ApiResponse.error("Could not provision shop for outlet"));
            outlet.setShopId(provisionedShopId);
        }
        HotelOutlet saved = outletRepo.save(outlet);
        try {
            rabbit.convertAndSend("aviqr.hotel", "outlet.new",
                Map.of("outletId", saved.getId().toString(), "hotelId", saved.getHotelId().toString(),
                       "name", saved.getName(), "outletType", saved.getOutletType().name()));
        } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok("Created", saved));
    }

    // Auto-provisions a shop-service Shop for a newly created outlet so it gets the full
    // shop-owner toolset (menu, staff, settings, loyalty, orders, ...) for free. Returns
    // the new shop's id, or null if shop-service could not be reached.
    private String provisionShop(HotelOutlet outlet, String uid) {
        try {
            Hotel hotel = hotelRepo.findById(outlet.getHotelId()).orElse(null);
            String phone = (hotel != null && hotel.getPhone() != null && !hotel.getPhone().isBlank())
                ? hotel.getPhone() : "0000000000";
            Map<String, Object> shopReq = Map.of("name", outlet.getName(), "phone", phone);
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", uid);
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                shopServiceUrl + "/api/v1/shops", new HttpEntity<>(shopReq, headers), Map.class);
            Map<?, ?> data = (Map<?, ?>) resp.getBody().get("data");
            return data.get("id").toString();
        } catch (Exception e) {
            log.warn("Failed to provision shop for outlet {}: {}", outlet.getName(), e.getMessage());
            return null;
        }
    }

    @GetMapping("/api/v1/hotel-outlets/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<HotelOutlet>>> getOutlets(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(outletRepo.findByHotelId(hotelId)));
    }

    @GetMapping("/api/v1/hotel-outlets/{id}")
    public ResponseEntity<ApiResponse<HotelOutlet>> getOutlet(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        HotelOutlet outlet = outletRepo.findById(id).orElse(null);
        if (outlet == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(outlet.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(outlet));
    }

    // Verifies the caller manages this outlet's hotel, then mints a short-lived JWT scoped
    // to the outlet's shop so every reused shop-owner page (Orders, Menu, Inventory, Reports,
    // QR, Billing, KOT, Payments, ...) authorizes correctly instead of hitting 403s caused by
    // the gateway blanking X-Shop-Id for HOTEL-role logins.
    @PostMapping("/api/v1/hotel-outlets/{id}/enter")
    public ResponseEntity<ApiResponse<Map<String, String>>> enter(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        HotelOutlet outlet = outletRepo.findById(id).orElse(null);
        if (outlet == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(outlet.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (outlet.getShopId() == null || outlet.getShopId().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Outlet has no linked shop"));
        String token = outletTokenService.mintOutletToken(uid, outlet.getShopId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("accessToken", token, "shopId", outlet.getShopId())));
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

    // Links one room to one outlet's menu — the room-service QR. Scanning it drops the
    // guest straight onto that outlet's menu (skipping the multi-outlet hub) with room
    // context pre-filled for "charge to room". Admin picks both room and outlet at
    // creation time ("one QR, one linked target") — the guest never chooses. Idempotent
    // per (outlet, room) pair, same find-or-create idiom as HotelController's room QR.
    @PostMapping("/api/v1/hotel-outlets/{id}/room-service-qr")
    public ResponseEntity<ApiResponse<Map>> createRoomServiceQrCode(
            @PathVariable UUID id,
            @RequestParam UUID roomId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        HotelOutlet outlet = outletRepo.findById(id).orElse(null);
        if (outlet == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(outlet.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (outlet.getShopId() == null || outlet.getShopId().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Outlet has no linked shop"));
        Room room = roomRepo.findById(roomId).orElse(null);
        if (room == null || !room.getHotelId().equals(outlet.getHotelId()))
            return ResponseEntity.badRequest().body(ApiResponse.error("Room not found for this hotel"));

        try {
            Map<String, Object> qr = findRoomServiceQr(outlet.getShopId(), room.getRoomNumber());
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + outlet.getShopId()
                        + "?label=Room " + room.getRoomNumber() + " → " + outlet.getName()
                        + "&type=ROOM_SERVICE&group=" + outlet.getHotelId() + "&roomNumber=" + room.getRoomNumber();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // A concurrent double-click may have just inserted the same row — re-check.
                    qr = findRoomServiceQr(outlet.getShopId(), room.getRoomNumber());
                    if (qr == null) throw createEx;
                }
            }
            return ResponseEntity.ok(ApiResponse.ok("Room service QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create room-service QR for outlet {} room {}: {}", id, roomId, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    private Map<String, Object> findRoomServiceQr(String shopId, String roomNumber) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + shopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream()
            .filter(q -> "ROOM_SERVICE".equals(q.get("type")) && roomNumber.equals(q.get("roomNumber")))
            .max(Comparator.comparing(q -> String.valueOf(q.get("createdAt"))))
            .orElse(null);
    }
}
