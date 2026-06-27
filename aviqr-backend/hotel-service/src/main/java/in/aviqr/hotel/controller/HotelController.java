package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor
public class HotelController {
    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final RoomRequestRepository reqRepo;
    private final RabbitTemplate rabbit;

    private ResponseEntity<ApiResponse<Void>> forbidden() {
        return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
    }

    private boolean ownsHotel(String role, String uid, UUID hotelId) {
        if ("ADMIN".equals(role)) return true;
        return hotelRepo.findById(hotelId).map(h -> uid.equals(h.getOwnerId())).orElse(false);
    }

    // ── Hotel CRUD ───────────────────────────────────────────────────────────
    @PostMapping("/api/v1/hotels")
    public ResponseEntity<ApiResponse<Hotel>> createHotel(@RequestBody Hotel hotel,
                                                           @RequestHeader("X-User-Id") String uid) {
        hotel.setOwnerId(uid);
        return ResponseEntity.ok(ApiResponse.ok("Created", hotelRepo.save(hotel)));
    }

    @GetMapping("/api/v1/hotels/my")
    public ResponseEntity<ApiResponse<List<Hotel>>> myHotels(@RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok(hotelRepo.findByOwnerId(uid)));
    }

    @GetMapping("/api/v1/hotels/{id}")
    public ResponseEntity<ApiResponse<Hotel>> getHotel(@PathVariable UUID id) {
        return hotelRepo.findById(id).map(h -> ResponseEntity.ok(ApiResponse.ok(h)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/hotels/{id}")
    public ResponseEntity<?> updateHotel(@PathVariable UUID id, @RequestBody Hotel req,
                                          @RequestHeader("X-User-Id") String uid,
                                          @RequestHeader("X-User-Role") String role) {
        if (!ownsHotel(role, uid, id)) return forbidden();
        return hotelRepo.findById(id).map(h -> {
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
    public ResponseEntity<?> createRoom(@RequestBody Room room,
                                         @RequestHeader("X-User-Id") String uid,
                                         @RequestHeader("X-User-Role") String role) {
        if (!ownsHotel(role, uid, room.getHotelId())) return forbidden();
        return ResponseEntity.ok(ApiResponse.ok("Created", roomRepo.save(room)));
    }

    @PutMapping("/api/v1/rooms/{id}/status")
    public ResponseEntity<?> updateRoomStatus(@PathVariable UUID id, @RequestParam String status,
                                               @RequestHeader("X-User-Id") String uid,
                                               @RequestHeader("X-User-Role") String role) {
        var room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!ownsHotel(role, uid, room.getHotelId())) return forbidden();
        room.setStatus(RoomStatus.valueOf(status.toUpperCase())); roomRepo.save(room);
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    @PutMapping("/api/v1/rooms/{id}/qr")
    public ResponseEntity<?> toggleRoomQr(@PathVariable UUID id, @RequestParam boolean active,
                                           @RequestHeader("X-User-Id") String uid,
                                           @RequestHeader("X-User-Role") String role) {
        var room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!ownsHotel(role, uid, room.getHotelId())) return forbidden();
        room.setQrActive(active); roomRepo.save(room);
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    // ── Room Requests ─────────────────────────────────────────────────────────
    // Created by a guest scanning the in-room QR — no ownership check, just authentication.
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
    public ResponseEntity<?> getHotelRequests(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String service,
            @RequestParam(required=false) boolean liveOnly,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader("X-User-Role") String role) {
        if (!ownsHotel(role, uid, hotelId)) return forbidden();
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
    public ResponseEntity<?> updateRequestStatus(
            @PathVariable UUID id, @RequestParam String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader("X-User-Role") String role) {
        var reqEntity = reqRepo.findById(id).orElse(null);
        if (reqEntity == null) return ResponseEntity.notFound().build();
        if (!ownsHotel(role, uid, reqEntity.getHotelId())) return forbidden();
        reqEntity.setStatus(RequestStatus.valueOf(status.toUpperCase()));
        if (status.equalsIgnoreCase("DONE")) reqEntity.setResolvedAt(LocalDateTime.now());
        return ResponseEntity.ok(ApiResponse.ok("Updated", reqRepo.save(reqEntity)));
    }
}