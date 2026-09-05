package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.RateChangeLog;
import in.aviqr.pms.repository.RateChangeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController @RequiredArgsConstructor
public class RateChangeLogController {

    private final RateChangeLogRepository repo;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/hotels/{hotelId}/rate-change-logs")
    public ResponseEntity<ApiResponse<Page<RateChangeLog>>> list(
            @PathVariable UUID hotelId,
            @RequestParam(required = false) UUID roomTypeId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "changedAt"));
        Page<RateChangeLog> result = roomTypeId != null
            ? repo.findByHotelIdAndRoomTypeIdOrderByChangedAtDesc(hotelId, roomTypeId, pageable)
            : repo.findByHotelIdOrderByChangedAtDesc(hotelId, pageable);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
