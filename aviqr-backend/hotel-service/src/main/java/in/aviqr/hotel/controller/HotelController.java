package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor
public class HotelController {
    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final RoomRequestRepository reqRepo;
    private final HotelAccessRepository accessRepo;
    private final HotelAccessService accessService;
    private final RabbitTemplate rabbit;

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