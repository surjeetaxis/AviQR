package in.aviqr.pms.controller;

import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.PublicBookingRequest;
import in.aviqr.pms.dto.PublicRoomTypeDto;
import in.aviqr.pms.dto.PublicRateQuote;
import in.aviqr.pms.dto.PublicAvailableRoomDto;
import in.aviqr.pms.dto.PublicBookingConfirmation;
import in.aviqr.pms.dto.PublicBookingExtras;
import in.aviqr.pms.dto.PublicPromoQuote;
import in.aviqr.pms.service.PublicBookingService;
import java.math.BigDecimal;
import in.aviqr.pms.service.RatePlanService;
import java.time.temporal.ChronoUnit;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import in.aviqr.pms.service.AvailabilityService;
import in.aviqr.pms.service.ReservationService;
import in.aviqr.pms.client.HotelServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Public direct booking engine (IBE) — a guest self-books from the hotel's own
 *  site, no staff involved. Unauthenticated like ContactlessCheckinController;
 *  one DIRECT-source reservation per checkout, with up to PublicBookingService.MAX_ROOMS rooms. */
@RestController @RequiredArgsConstructor
public class BookingEngineController {

    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final AvailabilityService availabilityService;
    private final ReservationService reservationService;
    private final RatePlanService ratePlanService;
    private final HotelServiceClient hotelServiceClient;
    private final PublicBookingService publicBookingService;

    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/room-types")
    public ResponseEntity<ApiResponse<List<PublicRoomTypeDto>>> roomTypes(@PathVariable UUID hotelId,
            @RequestParam(defaultValue="") String storefrontHost,@RequestParam(defaultValue="") String storefrontSlug) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        List<PublicRoomTypeDto> result = roomTypeRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .map(rt -> new PublicRoomTypeDto(rt.getId(), rt.getName(), rt.getDescription(), rt.getMaxOccupancy(),
                ratePlanRepo.findByRoomTypeIdAndActiveTrue(rt.getId()).stream()
                    .map(rp -> new PublicRoomTypeDto.RatePlanOption(rp.getId(), rp.getName(), rp.getBaseRate(),
                        rp.getMealPlan().name(), rp.getCancellationPolicy()))
                    .collect(Collectors.toList())))
            .filter(dto -> !dto.getRatePlans().isEmpty())
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/availability")
    public ResponseEntity<ApiResponse<Map<String,Object>>> availability(
            @PathVariable UUID hotelId, @RequestParam UUID roomTypeId,
            @RequestParam LocalDate checkIn, @RequestParam LocalDate checkOut,
            @RequestParam(defaultValue="") String storefrontHost,@RequestParam(defaultValue="") String storefrontSlug) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        int count = availabilityService.availableCount(hotelId, roomTypeId, checkIn, checkOut);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("availableRooms", count)));
    }

    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/room-map")
    public ResponseEntity<ApiResponse<List<PublicAvailableRoomDto>>> availableRoomOptions(
            @PathVariable UUID hotelId, @RequestParam UUID roomTypeId,
            @RequestParam LocalDate checkIn, @RequestParam LocalDate checkOut,
            @RequestParam(defaultValue="") String storefrontHost,@RequestParam(defaultValue="") String storefrontSlug) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        return ResponseEntity.ok(ApiResponse.ok(availabilityService.publicRoomMap(hotelId, roomTypeId, checkIn, checkOut)));
    }

    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/quote")
    public ResponseEntity<ApiResponse<PublicRateQuote>> quote(
            @PathVariable UUID hotelId, @RequestParam UUID roomTypeId, @RequestParam UUID ratePlanId,
            @RequestParam LocalDate checkIn, @RequestParam LocalDate checkOut,
            @RequestParam(defaultValue="") String storefrontHost,@RequestParam(defaultValue="") String storefrontSlug) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        var room=roomTypeRepo.findById(roomTypeId).orElse(null);
        var plan=ratePlanRepo.findById(ratePlanId).orElse(null);
        if (room==null || plan==null || !hotelId.equals(room.getHotelId()) || !hotelId.equals(plan.getHotelId())
                || !roomTypeId.equals(plan.getRoomTypeId()) || !Boolean.TRUE.equals(room.getActive())
                || !Boolean.TRUE.equals(plan.getActive()) || checkOut==null || !checkOut.isAfter(checkIn))
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid property, room, rate plan or stay"));
        ratePlanService.validateStay(ratePlanId,checkIn,checkOut);
        long nights=ChronoUnit.DAYS.between(checkIn,checkOut);
        return ResponseEntity.ok(ApiResponse.ok(new PublicRateQuote(roomTypeId,ratePlanId,nights,
            ratePlanService.totalForStay(ratePlanId,checkIn,checkOut),"INR")));
    }

    /** Add-ons a guest can buy and the hotel's taxes/fees, for the storefront's price breakdown. */
    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/extras")
    public ResponseEntity<ApiResponse<PublicBookingExtras>> extras(@PathVariable UUID hotelId,
            @RequestParam(defaultValue="") String storefrontHost,@RequestParam(defaultValue="") String storefrontSlug) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        return ResponseEntity.ok(ApiResponse.ok(publicBookingService.extras(hotelId)));
    }

    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/promo")
    public ResponseEntity<ApiResponse<PublicPromoQuote>> promo(@PathVariable UUID hotelId, @RequestParam String code,
            @RequestParam(defaultValue="0") BigDecimal roomTotal, @RequestParam(required=false) LocalDate checkIn,
            @RequestParam(defaultValue="") String storefrontHost,@RequestParam(defaultValue="") String storefrontSlug) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        return publicBookingService.promo(hotelId, code, roomTotal.max(BigDecimal.ZERO), checkIn)
            .map(p -> ResponseEntity.ok(ApiResponse.ok(p)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("That promo code isn't valid for this stay")));
    }

    @PostMapping("/api/v1/pms/public/booking-engine/{hotelId}/book")
    public ResponseEntity<ApiResponse<PublicBookingConfirmation>> book(@PathVariable UUID hotelId, @RequestBody PublicBookingRequest req) {
        requireBookingEngineAccess(hotelId,req.getStorefrontHost(),req.getStorefrontSlug());
        try {
            return ResponseEntity.ok(ApiResponse.ok("Booking confirmed", publicBookingService.book(hotelId, req)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    private void requireBookingEngineAccess(UUID hotelId,String host,String slug) {
        if (!hotelServiceClient.isBookingEnginePropertyAvailable(hotelId,host,slug))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
