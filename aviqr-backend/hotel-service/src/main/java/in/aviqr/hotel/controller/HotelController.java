package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class HotelController {
    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final RoomRequestRepository reqRepo;
    private final HotelAccessRepository accessRepo;
    private final HotelAccessService accessService;
    private final RabbitTemplate rabbit;
    private final RestTemplate restTemplate;

    @Value("${qr.service.url:http://order-qr-service}")
    private String qrServiceUrl;

    // ── Admin: list all hotels ────────────────────────────────────────────────
    @GetMapping("/api/v1/hotels/admin/all")
    public ResponseEntity<ApiResponse<Page<Hotel>>> adminAllHotels(
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(
            hotelRepo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    // ── Hotel CRUD ───────────────────────────────────────────────────────────
    @PostMapping("/api/v1/hotels")
    public ResponseEntity<ApiResponse<Hotel>> createHotel(@RequestBody Hotel hotel,
                                                           @RequestHeader("X-User-Id") String uid) {
        hotel.setOwnerId(uid);
        Hotel saved = hotelRepo.save(hotel);
        accessRepo.save(HotelAccess.builder().hotelId(saved.getId()).userId(uid).role(HotelRole.OWNER).build());
        return ResponseEntity.ok(ApiResponse.ok("Created", saved));
    }

    @GetMapping("/api/v1/hotels/my")
    public ResponseEntity<ApiResponse<List<Hotel>>> myHotels(@RequestHeader("X-User-Id") String uid) {
        List<UUID> hotelIds = accessRepo.findByUserId(uid).stream().map(HotelAccess::getHotelId).distinct().toList();
        List<Hotel> hotels = new ArrayList<>(hotelRepo.findAllById(hotelIds));
        hotelRepo.findByOwnerId(uid).forEach(h -> { if (hotels.stream().noneMatch(x -> x.getId().equals(h.getId()))) hotels.add(h); });
        return ResponseEntity.ok(ApiResponse.ok(hotels));
    }

    @GetMapping("/api/v1/hotels/{id}")
    public ResponseEntity<ApiResponse<Hotel>> getHotel(@PathVariable UUID id) {
        return hotelRepo.findById(id).map(h -> ResponseEntity.ok(ApiResponse.ok(h)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/hotels/{id}")
    public ResponseEntity<ApiResponse<Hotel>> updateHotel(
            @PathVariable UUID id, @RequestBody Hotel req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return hotelRepo.findById(id).map(h -> {
            if (!accessService.hasAccess(id, uid, role))
                return ResponseEntity.status(403).<ApiResponse<Hotel>>body(ApiResponse.error("Forbidden"));
            h.setName(req.getName()); h.setPhone(req.getPhone()); h.setAddress(req.getAddress());
            h.setCheckInTime(req.getCheckInTime()); h.setCheckOutTime(req.getCheckOutTime());
            if(req.getEnabledServices()!=null) h.setEnabledServices(req.getEnabledServices());
            return ResponseEntity.ok(ApiResponse.ok("Updated", hotelRepo.save(h)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Real, scannable, backend-tracked QR for the whole hotel (lobby/front-desk) — same
    // synthetic "hotel-{hotelId}" shopId bucket as room QRs, but QrType.HOTEL (no room
    // number), so guests land on GuestServices.jsx without a room context and get
    // prompted to scan their own room's QR for Requests/Bill — mirrors mall-service's
    // Mall QR (MallController#createMallQrCode) and shop-service's Brand QR.
    @PostMapping("/api/v1/hotels/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createHotelQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String syntheticShopId = "hotel-" + id;
        try {
            Map<String, Object> qr = findHotelQr(syntheticShopId);
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + syntheticShopId
                        + "?label=" + hotel.getName() + "&type=HOTEL";
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // Another concurrent request (e.g. React StrictMode's double-effect in dev, or
                    // a genuine simultaneous double-click) may have just inserted the same
                    // deterministic slug — re-check before giving up.
                    qr = findHotelQr(syntheticShopId);
                    if (qr == null) throw createEx;
                }
            }
            return ResponseEntity.ok(ApiResponse.ok("QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create QR for hotel {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    private Map<String, Object> findHotelQr(String syntheticShopId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + syntheticShopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream().filter(q -> "HOTEL".equals(q.get("type"))).findFirst().orElse(null);
    }

    // ── Rooms ─────────────────────────────────────────────────────────────────
    @GetMapping("/api/v1/rooms/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Room>>> getRooms(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(roomRepo.findByHotelId(hotelId)));
    }

    @PostMapping("/api/v1/rooms")
    public ResponseEntity<ApiResponse<Room>> createRoom(
            @RequestBody Room room,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", roomRepo.save(room)));
    }

    @PutMapping("/api/v1/rooms/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateRoomStatus(@PathVariable UUID id, @RequestParam String status) {
        roomRepo.findById(id).ifPresent(r -> { r.setStatus(RoomStatus.valueOf(status.toUpperCase())); roomRepo.save(r); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @PutMapping("/api/v1/rooms/{id}/qr")
    public ResponseEntity<ApiResponse<Void>> toggleRoomQr(@PathVariable UUID id, @RequestParam boolean active) {
        roomRepo.findById(id).ifPresent(r -> { r.setQrActive(active); roomRepo.save(r); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    // Generates (or returns the already-existing) real, scannable QR for a room via
    // qr-service — rooms have no shop-service Shop of their own, so they share a
    // synthetic "hotel-{hotelId}" shopId bucket, distinguished by groupParam=roomNumber
    // (same convention as qr-service's QrService.buildUrl HOTEL_ROOM case).
    @PostMapping("/api/v1/rooms/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createRoomQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String syntheticShopId = "hotel-" + room.getHotelId();
        try {
            Map<String, Object> qr = findRoomQr(syntheticShopId, room.getRoomNumber());
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + syntheticShopId
                        + "?label=Room " + room.getRoomNumber() + "&type=HOTEL_ROOM&group=" + room.getRoomNumber();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // Another concurrent request (e.g. React StrictMode's double-effect in dev, or
                    // a genuine simultaneous double-click) may have just inserted the same
                    // deterministic slug — re-check before giving up.
                    qr = findRoomQr(syntheticShopId, room.getRoomNumber());
                    if (qr == null) throw createEx;
                }
            }
            room.setQrActive(true); roomRepo.save(room);
            return ResponseEntity.ok(ApiResponse.ok("QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create QR for room {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    private Map<String, Object> findRoomQr(String syntheticShopId, String roomNumber) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + syntheticShopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream()
            .filter(q -> "HOTEL_ROOM".equals(q.get("type")) && roomNumber.equals(q.get("groupParam")))
            .findFirst().orElse(null);
    }

    // ── Room Requests ─────────────────────────────────────────────────────────
    @PostMapping("/api/v1/room-requests")
    public ResponseEntity<ApiResponse<RoomRequest>> createRequest(@RequestBody RoomRequest req) {
        RoomRequest saved = reqRepo.save(req);
        try {
            rabbit.convertAndSend("aviqr.hotel", "request.new",
                Map.of("requestId", saved.getId().toString(), "hotelId", req.getHotelId().toString(),
                       "roomNumber", req.getRoomNumber(), "service", req.getServiceType()));
        } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok("Request submitted", saved));
    }

    @GetMapping("/api/v1/room-requests/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<RoomRequest>>> getHotelRequests(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String service,
            @RequestParam(required=false, defaultValue="false") boolean liveOnly,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<RoomRequest> result;
        if (service != null) {
            result = reqRepo.findByHotelIdAndServiceTypeOrderByCreatedAtDesc(hotelId, service.toUpperCase());
        } else if (liveOnly) {
            result = reqRepo.findByHotelIdAndStatusInOrderByCreatedAtDesc(hotelId,
                List.of(RequestStatus.NEW, RequestStatus.ACCEPTED, RequestStatus.PREPARING));
        } else {
            result = reqRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/api/v1/room-requests/{id}/status")
    public ResponseEntity<ApiResponse<RoomRequest>> updateRequestStatus(
            @PathVariable UUID id, @RequestParam String status) {
        return reqRepo.findById(id).map(r -> {
            r.setStatus(RequestStatus.valueOf(status.toUpperCase()));
            if (status.equalsIgnoreCase("DONE")) r.setResolvedAt(LocalDateTime.now());
            return ResponseEntity.ok(ApiResponse.ok("Updated", reqRepo.save(r)));
        }).orElse(ResponseEntity.notFound().build());
    }
}