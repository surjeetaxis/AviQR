package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.DayPriceBulkRequest;
import in.aviqr.pms.dto.DayPriceUpdateRequest;
import in.aviqr.pms.entity.DayPrice;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.repository.DayPriceRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.service.ChannelService;
import in.aviqr.pms.service.RateChangeLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor @Slf4j
public class RatePlanController {

    private final RatePlanRepository ratePlanRepo;
    private final DayPriceRepository dayPriceRepo;
    private final HotelServiceClient hotelServiceClient;
    private final RateChangeLogService changeLog;
    private final ChannelService channelService;

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
            @PathVariable UUID id, @RequestBody DayPriceUpdateRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        RatePlan plan = ratePlanRepo.findById(id).orElse(null);
        if (plan == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(plan.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        DayPrice saved = applyDayPrice(plan, req.getDate(), req.getPrice(), req.getMinStay(), req.getMaxStay(),
            req.getClosedToArrival(), req.getClosedToDeparture(), req.getStopSell(), uid);
        if (Boolean.TRUE.equals(req.getAutoSync())) triggerAutoSync(plan.getRoomTypeId());
        return ResponseEntity.ok(ApiResponse.ok("Saved", saved));
    }

    // Bulk variant of setDayPrice: applies the same fields to every date in the list,
    // so setting e.g. a festival-week rate doesn't take one click per day. Any field
    // left null is left untouched for every date — same merge semantics as a single save.
    @PostMapping("/api/v1/pms/rate-plans/{id}/day-prices/bulk")
    public ResponseEntity<ApiResponse<List<DayPrice>>> bulkSetDayPrice(
            @PathVariable UUID id, @RequestBody DayPriceBulkRequest req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        RatePlan plan = ratePlanRepo.findById(id).orElse(null);
        if (plan == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(plan.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (req.getDates() == null || req.getDates().isEmpty())
            return ResponseEntity.badRequest().body(ApiResponse.error("At least one date is required"));

        List<DayPrice> saved = req.getDates().stream()
            .map(date -> applyDayPrice(plan, date, req.getPrice(), req.getMinStay(), req.getMaxStay(),
                req.getClosedToArrival(), req.getClosedToDeparture(), req.getStopSell(), uid))
            .toList();
        if (Boolean.TRUE.equals(req.getAutoSync())) triggerAutoSync(plan.getRoomTypeId());
        return ResponseEntity.ok(ApiResponse.ok("Saved " + saved.size() + " date(s)", saved));
    }

    // Merge onto any existing row for that date rather than replacing it wholesale — a
    // caller setting just a restriction shouldn't wipe out an already-set price override,
    // and vice versa (price and restrictions are typically edited separately). Shared by
    // both the single-date and bulk endpoints so they log/merge identically.
    private DayPrice applyDayPrice(RatePlan plan, LocalDate date, BigDecimal price, Integer minStay, Integer maxStay,
                                    Boolean closedToArrival, Boolean closedToDeparture, Boolean stopSell, String uid) {
        UUID ratePlanId = plan.getId();
        DayPrice existing = dayPriceRepo.findByRatePlanIdAndDate(ratePlanId, date).orElse(null);
        if (existing != null) {
            if (price != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "price", existing.getPrice(), price, uid);
                existing.setPrice(price);
            }
            if (minStay != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "minStay", existing.getMinStay(), minStay, uid);
                existing.setMinStay(minStay);
            }
            if (maxStay != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "maxStay", existing.getMaxStay(), maxStay, uid);
                existing.setMaxStay(maxStay);
            }
            if (closedToArrival != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "closedToArrival", existing.getClosedToArrival(), closedToArrival, uid);
                existing.setClosedToArrival(closedToArrival);
            }
            if (closedToDeparture != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "closedToDeparture", existing.getClosedToDeparture(), closedToDeparture, uid);
                existing.setClosedToDeparture(closedToDeparture);
            }
            if (stopSell != null) {
                changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "stopSell", existing.getStopSell(), stopSell, uid);
                existing.setStopSell(stopSell);
            }
            return dayPriceRepo.save(existing);
        }
        DayPrice fresh = DayPrice.builder()
            .ratePlanId(ratePlanId).date(date).price(price).minStay(minStay).maxStay(maxStay)
            .closedToArrival(closedToArrival != null ? closedToArrival : false)
            .closedToDeparture(closedToDeparture != null ? closedToDeparture : false)
            .stopSell(stopSell != null ? stopSell : false)
            .build();
        DayPrice saved = dayPriceRepo.save(fresh);
        if (price != null) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "price", null, price, uid);
        if (minStay != null) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "minStay", null, minStay, uid);
        if (maxStay != null) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "maxStay", null, maxStay, uid);
        if (Boolean.TRUE.equals(closedToArrival)) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "closedToArrival", false, true, uid);
        if (Boolean.TRUE.equals(closedToDeparture)) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "closedToDeparture", false, true, uid);
        if (Boolean.TRUE.equals(stopSell)) changeLog.logIfChanged(plan.getHotelId(), plan.getRoomTypeId(), ratePlanId, date, "stopSell", false, true, uid);
        return saved;
    }

    // Fire-and-log-only: a sync failure (or the channel service itself erroring) must
    // never fail the price/inventory save that triggered it — the push's own success/
    // failure is already recorded per-mapping in the channel sync log.
    private void triggerAutoSync(UUID roomTypeId) {
        try {
            channelService.pushForRoomType(roomTypeId);
        } catch (Exception e) {
            log.warn("Auto-sync push failed for room type {}: {}", roomTypeId, e.getMessage());
        }
    }

    @GetMapping("/api/v1/pms/rate-plans/{id}/day-prices")
    public ResponseEntity<ApiResponse<List<DayPrice>>> listDayPrices(
            @PathVariable UUID id,
            @RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(ApiResponse.ok(
            dayPriceRepo.findByRatePlanIdAndDateBetween(id, java.time.LocalDate.parse(from), java.time.LocalDate.parse(to))));
    }
}
