package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.DayPrice;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.repository.DayPriceRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.service.RateChangeLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class RatePlanController {

    private final RatePlanRepository ratePlanRepo;
    private final DayPriceRepository dayPriceRepo;
    private final HotelServiceClient hotelServiceClient;
    private final RateChangeLogService changeLog;

    @PostMapping("/api/v1/pms/rate-plans")
    public ResponseEntity<ApiResponse<RatePlan>> create(
            @RequestBody RatePlan req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        req.setId(null);
        return ResponseEntity.ok(ApiResponse.ok("Created", ratePlanRepo.save(req)));
    }

    @GetMapping("/api/v1/pms/rate-plans/room-type/{roomTypeId}")
    public ResponseEntity<ApiResponse<List<RatePlan>>> listForRoomType(@PathVariable UUID roomTypeId) {
        return ResponseEntity.ok(ApiResponse.ok(ratePlanRepo.findByRoomTypeIdAndActiveTrue(roomTypeId)));
    }

    @PutMapping("/api/v1/pms/rate-plans/{id}")
    public ResponseEntity<ApiResponse<RatePlan>> update(
            @PathVariable UUID id, @RequestBody RatePlan req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return ratePlanRepo.findById(id).map(rp -> {
            if (!hotelServiceClient.hasAccess(rp.getHotelId(), uid, role))
                return ResponseEntity.status(403).<ApiResponse<RatePlan>>body(ApiResponse.error("Forbidden"));
            rp.setName(req.getName());
            rp.setBaseRate(req.getBaseRate());
            rp.setCancellationPolicy(req.getCancellationPolicy());
            rp.setOccupancy(req.getOccupancy());
            if (req.getMealPlan() != null) rp.setMealPlan(req.getMealPlan());
            if (req.getActive() != null) rp.setActive(req.getActive());
            return ResponseEntity.ok(ApiResponse.ok("Updated", ratePlanRepo.save(rp)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── Date-specific overrides ─────────────────────────────────────────────────
    @PostMapping("/api/v1/pms/rate-plans/{id}/day-prices")
    public ResponseEntity<ApiResponse<DayPrice>> setDayPrice(
            @PathVariable UUID id, @RequestBody DayPrice req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        RatePlan plan = ratePlanRepo.findById(id).orElse(null);
        if (plan == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(plan.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        // Merge onto any existing row for that date rather than replacing it wholesale —
        // a caller setting just a restriction shouldn't wipe out an already-set price
        // override, and vice versa (price and restrictions are typically edited separately).
        DayPrice existing = dayPriceRepo.findByRatePlanIdAndDate(id, req.getDate()).orElse(null);
        if (existing != null) {
            if (req.getPrice() != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(),
                    "price", existing.getPrice(), req.getPrice(), uid);
                existing.setPrice(req.getPrice());
            }
            if (req.getMinStay() != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(),
                    "minStay", existing.getMinStay(), req.getMinStay(), uid);
                existing.setMinStay(req.getMinStay());
            }
            if (req.getMaxStay() != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(),
                    "maxStay", existing.getMaxStay(), req.getMaxStay(), uid);
                existing.setMaxStay(req.getMaxStay());
            }
            if (req.getClosedToArrival() != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(),
                    "closedToArrival", existing.getClosedToArrival(), req.getClosedToArrival(), uid);
                existing.setClosedToArrival(req.getClosedToArrival());
            }
            if (req.getClosedToDeparture() != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(),
                    "closedToDeparture", existing.getClosedToDeparture(), req.getClosedToDeparture(), uid);
                existing.setClosedToDeparture(req.getClosedToDeparture());
            }
            if (req.getStopSell() != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(),
                    "stopSell", existing.getStopSell(), req.getStopSell(), uid);
                existing.setStopSell(req.getStopSell());
            }
            return ResponseEntity.ok(ApiResponse.ok("Saved", dayPriceRepo.save(existing)));
        }
        req.setId(null);
        req.setRatePlanId(id);
        DayPrice saved = dayPriceRepo.save(req);
        if (req.getPrice() != null) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(), "price", null, req.getPrice(), uid);
        if (req.getMinStay() != null) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(), "minStay", null, req.getMinStay(), uid);
        if (req.getMaxStay() != null) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(), "maxStay", null, req.getMaxStay(), uid);
        if (Boolean.TRUE.equals(req.getClosedToArrival())) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(), "closedToArrival", false, true, uid);
        if (Boolean.TRUE.equals(req.getClosedToDeparture())) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(), "closedToDeparture", false, true, uid);
        if (Boolean.TRUE.equals(req.getStopSell())) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), id, req.getDate(), "stopSell", false, true, uid);
        return ResponseEntity.ok(ApiResponse.ok("Saved", saved));
    }

    @GetMapping("/api/v1/pms/rate-plans/{id}/day-prices")
    public ResponseEntity<ApiResponse<List<DayPrice>>> listDayPrices(
            @PathVariable UUID id,
            @RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(ApiResponse.ok(
            dayPriceRepo.findByRatePlanIdAndDateBetween(id, java.time.LocalDate.parse(from), java.time.LocalDate.parse(to))));
    }
}
