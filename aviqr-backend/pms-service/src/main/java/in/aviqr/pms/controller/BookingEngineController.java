package in.aviqr.pms.controller;

import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.CreateReservationRequest;
import in.aviqr.pms.dto.PublicBookingRequest;
import in.aviqr.pms.dto.PublicRoomTypeDto;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationSource;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import in.aviqr.pms.service.AvailabilityService;
import in.aviqr.pms.service.ReservationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Public direct booking engine (IBE) — a guest self-books from the hotel's own
 *  site, no staff involved. Unauthenticated like ContactlessCheckinController;
 *  always a single-room, DIRECT-source reservation. */
@RestController @RequiredArgsConstructor
public class BookingEngineController {

    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final AvailabilityService availabilityService;
    private final ReservationService reservationService;

    @GetMapping("/api/v1/pms/public/booking-engine/{hotelId}/room-types")
    public ResponseEntity<ApiResponse<List<PublicRoomTypeDto>>> roomTypes(@PathVariable UUID hotelId) {
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
            @RequestParam LocalDate checkIn, @RequestParam LocalDate checkOut) {
        int count = availabilityService.availableCount(hotelId, roomTypeId, checkIn, checkOut);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("availableRooms", count)));
    }

    @PostMapping("/api/v1/pms/public/booking-engine/{hotelId}/book")
    public ResponseEntity<ApiResponse<Reservation>> book(@PathVariable UUID hotelId, @RequestBody PublicBookingRequest req) {
        if (req.getGuestName() == null || req.getGuestName().isBlank()
                || req.getGuestPhone() == null || req.getGuestPhone().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Name and phone are required"));
        RoomType roomType = roomTypeRepo.findById(req.getRoomTypeId()).orElse(null);
        if (roomType == null || !roomType.getHotelId().equals(hotelId))
            return ResponseEntity.badRequest().body(ApiResponse.error("Invalid room type"));

        CreateReservationRequest cr = new CreateReservationRequest();
        cr.setHotelId(hotelId);
        cr.setGuestName(req.getGuestName());
        cr.setGuestPhone(req.getGuestPhone());
        cr.setCheckInDate(req.getCheckInDate());
        cr.setCheckOutDate(req.getCheckOutDate());
        cr.setAdults(req.getAdults());
        cr.setChildren(req.getChildren());
        cr.setSource(ReservationSource.DIRECT);
        CreateReservationRequest.RoomBooking rb = new CreateReservationRequest.RoomBooking();
        rb.setRoomTypeId(req.getRoomTypeId());
        rb.setRatePlanId(req.getRatePlanId());
        cr.setRooms(List.of(rb));

        Reservation reservation = reservationService.create(cr, "web-booking-engine");
        return ResponseEntity.ok(ApiResponse.ok("Booking confirmed", reservation));
    }
}
