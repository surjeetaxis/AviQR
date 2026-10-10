package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Deal;
import in.aviqr.pms.repository.DealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Staff management of booking-engine deals (offers applied without a code). */
@RestController @RequiredArgsConstructor
public class DealController {

    private final DealRepository dealRepo;
    private final HotelServiceClient hotelServiceClient;

    @GetMapping("/api/v1/pms/deals/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Deal>>> list(@PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(dealRepo.findByHotelIdOrderByCreatedAtDesc(hotelId)));
    }

    @PostMapping("/api/v1/pms/deals")
    public ResponseEntity<ApiResponse<Deal>> create(@RequestBody Deal req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (req.getHotelId() == null || !hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Deal deal = Deal.builder().hotelId(req.getHotelId()).active(true).build();
        String problem = apply(deal, req);
        if (problem != null) return ResponseEntity.badRequest().body(ApiResponse.error(problem));
        return ResponseEntity.ok(ApiResponse.ok("Created", dealRepo.save(deal)));
    }

    @PutMapping("/api/v1/pms/deals/{id}")
    public ResponseEntity<ApiResponse<Deal>> update(@PathVariable UUID id, @RequestBody Deal req,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Deal deal = dealRepo.findById(id).orElse(null);
        if (deal == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(deal.getHotelId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        String problem = apply(deal, req);
        if (problem != null) return ResponseEntity.badRequest().body(ApiResponse.error(problem));
        if (req.getActive() != null) deal.setActive(req.getActive());
        return ResponseEntity.ok(ApiResponse.ok("Updated", dealRepo.save(deal)));
    }

    @DeleteMapping("/api/v1/pms/deals/{id}")
    public ResponseEntity<ApiResponse<Boolean>> delete(@PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid, @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Deal deal = dealRepo.findById(id).orElse(null);
        if (deal == null) return ResponseEntity.notFound().build();
        if (!hotelServiceClient.hasAccess(deal.getHotelId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        dealRepo.delete(deal);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", true));
    }

    private static String apply(Deal deal, Deal req) {
        String name = req.getName() == null ? "" : req.getName().strip();
        if (name.isEmpty() || name.length() > 80) return "Give the deal a name (up to 80 characters)";
        if (req.getDescription() != null && req.getDescription().length() > 200) return "The description can be up to 200 characters";
        if (req.getValueType() == null || req.getValue() == null || req.getValue().signum() <= 0) return "Set the discount";
        if (req.getValueType() == in.aviqr.pms.entity.ValueType.PERCENT && req.getValue().compareTo(BigDecimal.valueOf(100)) > 0)
            return "A percentage discount can be at most 100%";
        if (req.getStayFrom() != null && req.getStayTo() != null && req.getStayTo().isBefore(req.getStayFrom())) return "The stay window ends before it starts";
        if (req.getBookFrom() != null && req.getBookTo() != null && req.getBookTo().isBefore(req.getBookFrom())) return "The booking window ends before it starts";
        for (Integer n : new Integer[]{req.getMinNights(), req.getMinDaysAhead(), req.getMaxDaysAhead()})
            if (n != null && (n < 0 || n > 730)) return "Nights and days must be between 0 and 730";
        if (req.getMinDaysAhead() != null && req.getMaxDaysAhead() != null && req.getMaxDaysAhead() < req.getMinDaysAhead())
            return "Days ahead: the maximum is below the minimum";
        deal.setName(name);
        deal.setDescription(req.getDescription() == null || req.getDescription().isBlank() ? null : req.getDescription().strip());
        deal.setValueType(req.getValueType());
        deal.setValue(req.getValue());
        deal.setStayFrom(req.getStayFrom());
        deal.setStayTo(req.getStayTo());
        deal.setBookFrom(req.getBookFrom());
        deal.setBookTo(req.getBookTo());
        deal.setMinNights(req.getMinNights());
        deal.setMinDaysAhead(req.getMinDaysAhead());
        deal.setMaxDaysAhead(req.getMaxDaysAhead());
        return null;
    }
}
