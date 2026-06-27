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
    public ResponseEntity<ApiResponse<Hotel>> updateHotel(@PathVariable UUID id, @RequestBody Hotel req) {
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
    public ResponseEntity<ApiResponse<Room>> createRoom(@RequestBody Room room) {
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
            @RequestParam(required=false) boolean liveOnly) {
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