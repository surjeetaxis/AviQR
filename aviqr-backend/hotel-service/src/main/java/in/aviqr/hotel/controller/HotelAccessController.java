package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class HotelAccessController {
    private final HotelAccessRepository accessRepo;
    private final HotelRepository hotelRepo;
    private final HotelAccessService accessService;

    @PostMapping("/api/v1/hotels/{id}/access")
    public ResponseEntity<ApiResponse<HotelAccess>> grant(
            @PathVariable UUID id, @RequestBody HotelAccess req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (!hotelRepo.existsById(id)) return ResponseEntity.notFound().build();
        req.setId(null);
        req.setHotelId(id);
        return ResponseEntity.ok(ApiResponse.ok("Access granted", accessRepo.save(req)));
    }

    @GetMapping("/api/v1/hotels/{id}/access")
    public ResponseEntity<ApiResponse<List<HotelAccess>>> list(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(accessRepo.findByHotelId(id)));
    }

    @DeleteMapping("/api/v1/hotels/{id}/access/{accessId}")
    public ResponseEntity<ApiResponse<Void>> revoke(
            @PathVariable UUID id, @PathVariable UUID accessId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        accessRepo.findById(accessId).filter(a -> a.getHotelId().equals(id)).ifPresent(accessRepo::delete);
        return ResponseEntity.ok(ApiResponse.ok("Revoked", null));
    }

    // Multi-property dashboard: every hotel this user has any access row for.
    @GetMapping("/api/v1/owners/{userId}/hotels")
    public ResponseEntity<ApiResponse<List<Hotel>>> hotelsForOwner(@PathVariable String userId) {
        List<UUID> hotelIds = accessRepo.findByUserId(userId).stream().map(HotelAccess::getHotelId).distinct().toList();
        return ResponseEntity.ok(ApiResponse.ok(hotelRepo.findAllById(hotelIds)));
    }
}
