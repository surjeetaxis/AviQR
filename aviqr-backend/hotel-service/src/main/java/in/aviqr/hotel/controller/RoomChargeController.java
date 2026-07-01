package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor
public class RoomChargeController {
    private final RoomRepository roomRepo;
    private final RoomChargeRepository chargeRepo;
    private final HotelAccessService accessService;

    @GetMapping("/api/v1/rooms/{id}/charges")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCharges(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<RoomCharge> charges = chargeRepo.findByHotelIdAndRoomNumberOrderByCreatedAtDesc(room.getHotelId(), room.getRoomNumber());
        BigDecimal pendingTotal = charges.stream()
            .filter(c -> c.getStatus() == RoomChargeStatus.PENDING)
            .map(RoomCharge::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("charges", charges, "pendingTotal", pendingTotal)));
    }

    @PostMapping("/api/v1/rooms/{id}/settle-charges")
    public ResponseEntity<ApiResponse<Void>> settleCharges(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<RoomCharge> pending = chargeRepo.findByHotelIdAndRoomNumberAndStatus(
            room.getHotelId(), room.getRoomNumber(), RoomChargeStatus.PENDING);
        LocalDateTime now = LocalDateTime.now();
        pending.forEach(c -> { c.setStatus(RoomChargeStatus.SETTLED); c.setSettledAt(now); c.setSettledBy(uid); });
        chargeRepo.saveAll(pending);
        return ResponseEntity.ok(ApiResponse.ok("Settled " + pending.size() + " charges", null));
    }
}
