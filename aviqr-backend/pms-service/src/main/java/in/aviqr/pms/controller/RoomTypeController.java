package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class RoomTypeController {

    private final RoomTypeRepository roomTypeRepo;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/room-types")
    public ResponseEntity<ApiResponse<RoomType>> create(
            @RequestBody RoomType req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        req.setId(null);
        return ResponseEntity.ok(ApiResponse.ok("Created", roomTypeRepo.save(req)));
    }

    @GetMapping("/api/v1/pms/room-types/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<RoomType>>> listForHotel(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(roomTypeRepo.findByHotelIdAndActiveTrue(hotelId)));
    }

    @PutMapping("/api/v1/pms/room-types/{id}")
    public ResponseEntity<ApiResponse<RoomType>> update(
            @PathVariable UUID id, @RequestBody RoomType req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return roomTypeRepo.findById(id).map(rt -> {
            if (!hotelServiceClient.hasAccess(rt.getHotelId(), uid, role))
                return ResponseEntity.status(403).<ApiResponse<RoomType>>body(ApiResponse.error("Forbidden"));
            rt.setName(req.getName());
            rt.setDescription(req.getDescription());
            rt.setMaxOccupancy(req.getMaxOccupancy());
            if (req.getActive() != null) rt.setActive(req.getActive());
            return ResponseEntity.ok(ApiResponse.ok("Updated", roomTypeRepo.save(rt)));
        }).orElse(ResponseEntity.notFound().build());
    }
}
