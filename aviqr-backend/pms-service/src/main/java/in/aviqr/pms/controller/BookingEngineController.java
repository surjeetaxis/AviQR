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
import in.aviqr.pms.service.BookingVoucherService;
import in.aviqr.pms.dto.PublicVoucher;
import in.aviqr.pms.repository.ReservationRepository;
import java.util.concurrent.CompletableFuture;
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
    private final BookingVoucherService voucherService;
    private final ReservationRepository reservationRepo;

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
        boolean retry=req.getBookingRequestId()!=null && reservationRepo.findByBookingRequestId(req.getBookingRequestId().toString()).isPresent();
        PublicBookingConfirmation confirmation;
        try {
            confirmation=publicBookingService.book(hotelId, req);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
        UUID id=confirmation.reservationId();
        // Sent after the booking has committed, off the request thread; email never fails a booking.
        if (!retry && req.getGuestEmail()!=null && !req.getGuestEmail().isBlank())
            CompletableFuture.runAsync(() -> voucherService.email(id, req.getStorefrontHost()));
        return ResponseEntity.ok(ApiResponse.ok("Booking confirmed",
            confirmation.withVoucher(BookingVoucherService.reference(id), voucherService.tokenFor(id))));
    }

    /** The guest's booking voucher; the token comes from the booking confirmation or the voucher email. */
    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/reservations/{reservationId}/voucher")
    public ResponseEntity<ApiResponse<PublicVoucher>> voucher(@PathVariable UUID hotelId, @PathVariable UUID reservationId,
            @RequestParam String token) {
        return voucherService.voucher(hotelId, reservationId, token).map(v -> ResponseEntity.ok(ApiResponse.ok(v)))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Booking not found")));
    }

    @PostMapping("/api/v1/pms/public/booking-engine/{hotelId}/reservations/{reservationId}/voucher/email")
    public ResponseEntity<ApiResponse<Boolean>> emailVoucher(@PathVariable UUID hotelId, @PathVariable UUID reservationId,
            @RequestParam String token, @RequestParam(defaultValue="") String storefrontHost) {
        if (voucherService.voucher(hotelId, reservationId, token).isEmpty())
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("Booking not found"));
        return voucherService.email(reservationId, storefrontHost)
            ? ResponseEntity.ok(ApiResponse.ok("Voucher sent", true))
            : ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("The voucher couldn't be emailed. Check there's an email on the booking, or try again later."));
    }

    private final java.util.Map<String, java.util.Deque<java.time.Instant>> giftChecks = new java.util.concurrent.ConcurrentHashMap<>();

    /** Gift voucher balance for checkout. Limited to 10 checks per caller per 10 minutes so codes can't be enumerated. */
    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/gift-voucher")
    public ResponseEntity<ApiResponse<Map<String,Object>>> giftVoucher(@PathVariable UUID hotelId, @RequestParam String code,
            @RequestParam(defaultValue="") String storefrontHost, @RequestParam(defaultValue="") String storefrontSlug,
            @RequestHeader(value="X-Forwarded-For", defaultValue="") String forwardedFor) {
        requireBookingEngineAccess(hotelId,storefrontHost,storefrontSlug);
        String caller=forwardedFor.split(",")[0].trim();
        java.util.Deque<java.time.Instant> recent=giftChecks.computeIfAbsent(hotelId+"|"+caller,k->new java.util.ArrayDeque<>());
        synchronized (recent) {
            java.time.Instant cutoff=java.time.Instant.now().minusSeconds(600);
            while (!recent.isEmpty() && recent.peekFirst().isBefore(cutoff)) recent.pollFirst();
            if (recent.size()>=10) return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error("Too many tries. Please wait a few minutes."));
            recent.addLast(java.time.Instant.now());
        }
        return publicBookingService.giftVoucher(hotelId, code)
            .map(v -> ResponseEntity.ok(ApiResponse.ok(Map.<String,Object>of("code", v.getCode(), "balance", v.getBalance()))))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("That gift voucher isn't valid or has no balance left")));
    }

    /** Find a booking by its reference (first 8 characters) and the phone it was made with. */
    @GetMapping("/api/v1/pms/public/booking-engine/reservations/find")
    public ResponseEntity<ApiResponse<Map<String,Object>>> findBooking(@RequestParam String reference, @RequestParam String phone) {
        return voucherService.find(reference, phone)
            .map(r -> ResponseEntity.ok(ApiResponse.ok(Map.<String,Object>of("hotelId", r.getHotelId(), "reservationId", r.getId(),
                "voucherToken", voucherService.tokenFor(r.getId())))))
            .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error("No booking matches that reference and phone")));
    }

    private void requireBookingEngineAccess(UUID hotelId,String host,String slug) {
        if (!hotelServiceClient.isBookingEnginePropertyAvailable(hotelId,host,slug))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
