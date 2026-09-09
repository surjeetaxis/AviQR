package in.aviqr.pms.controller;

import in.aviqr.pms.client.AuthServiceClient;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.UserLookupDto;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.RateChangeLogResponse;
import in.aviqr.pms.entity.RateChangeLog;
import in.aviqr.pms.repository.RateChangeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class RateChangeLogController {

    private final RateChangeLogRepository repo;
    private final HotelServiceClient hotelServiceClient;
    private final AuthServiceClient authServiceClient;

    // Same three-way split as the Inventory & Rates Calendar / Booking Calendar view
    // filters, so "Inventory only" etc. means the same thing everywhere in the app.
    private static final Map<String, List<String>> CATEGORY_FIELDS = Map.of(
        "inventory", List.of("allotment"),
        "prices", List.of("price"),
        "restrictions", List.of("minStay", "maxStay", "closedToArrival", "closedToDeparture", "stopSell")
    );

    @GetMapping("/api/v1/pms/hotels/{hotelId}/rate-change-logs")
    public ResponseEntity<ApiResponse<Page<RateChangeLogResponse>>> list(
            @PathVariable UUID hotelId,
            @RequestParam(required = false) UUID roomTypeId,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value = "X-User-Role", defaultValue = "") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "changedAt"));
        // Map.of(...) is immutable and does NOT null-check its key in get() —
        // Map.of().get(null) throws NPE rather than returning null, so guard first
        // (category is legitimately null/absent for the "All" tab).
        List<String> fields = category == null ? null : CATEGORY_FIELDS.get(category);

        Page<RateChangeLog> result;
        if (fields != null && roomTypeId != null) {
            result = repo.findByHotelIdAndRoomTypeIdAndFieldInOrderByChangedAtDesc(hotelId, roomTypeId, fields, pageable);
        } else if (fields != null) {
            result = repo.findByHotelIdAndFieldInOrderByChangedAtDesc(hotelId, fields, pageable);
        } else if (roomTypeId != null) {
            result = repo.findByHotelIdAndRoomTypeIdOrderByChangedAtDesc(hotelId, roomTypeId, pageable);
        } else {
            result = repo.findByHotelIdOrderByChangedAtDesc(hotelId, pageable);
        }

        Map<String, UserLookupDto> usersById = authServiceClient.lookupUsers(
            result.getContent().stream().map(RateChangeLog::getChangedBy).toList());

        Page<RateChangeLogResponse> enriched = result.map(l -> {
            UserLookupDto u = usersById.get(l.getChangedBy());
            return RateChangeLogResponse.builder()
                .id(l.getId()).hotelId(l.getHotelId()).roomTypeId(l.getRoomTypeId()).ratePlanId(l.getRatePlanId())
                .date(l.getDate()).field(l.getField()).oldValue(l.getOldValue()).newValue(l.getNewValue())
                .changedBy(l.getChangedBy())
                .changedByName(u != null ? u.getName() : null)
                .changedByEmail(u != null ? u.getEmail() : null)
                .changedAt(l.getChangedAt())
                .build();
        });
        return ResponseEntity.ok(ApiResponse.ok(enriched));
    }
}
