package in.aviqr.hotel.controller;

import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * PUBLIC guest-facing API — no authentication.
 * This is what a guest reaches after scanning an in-room / in-outlet QR code.
 *
 * Flow (mirrors Marriott / Pxier / Oracle OPERA industry pattern):
 *   1. Guest scans QR  →  GET /public/hotel/{hotelId}/services?room=204
 *      Returns the hotel's service hub: all outlets (room service, bar, restaurant,
 *      spa, pool, shops, activities) + whether room is checked-in (for charge-to-room).
 *   2. Guest picks an outlet  →  sees its services / menu (menu lives in shop-service).
 *   3. Guest orders or books, choosing CHARGE_TO_ROOM or PAY_DIRECT.
 *   4. Guest can raise service requests (housekeeping, amenities, concierge).
 *   5. Guest can view their running folio  →  GET /public/hotel/{hotelId}/folio?room=204
 */
@RestController
@RequestMapping("/api/v1/public/hotel")
@RequiredArgsConstructor
public class GuestServiceController {

    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final HotelOutletRepository outletRepo;
    private final RoomChargeRepository chargeRepo;
    private final GuestServiceRequestRepository requestRepo;
    private final OutletBookingRepository bookingRepo;

    // ── 1. Service hub — what the QR scan lands on ──────────────────────────────
    @GetMapping("/{hotelId}/services")
    public ResponseEntity<ApiResponse<Map<String,Object>>> serviceHub(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String room,
            @RequestParam(required=false) String area) {   // e.g. area=POOL for a poolside QR

        Hotel hotel = hotelRepo.findById(hotelId).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();

        List<HotelOutlet> outlets = outletRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .filter(o -> Boolean.TRUE.equals(o.getQrActive()))
            .collect(Collectors.toList());

        // If a specific area was scanned, surface that outlet first
        if (area != null) {
            outlets.sort((a,b) -> {
                boolean am = a.getOutletType().name().equalsIgnoreCase(area);
                boolean bm = b.getOutletType().name().equalsIgnoreCase(area);
                return Boolean.compare(bm, am);
            });
        }

        // Room + check-in status governs whether "charge to room" is offered
        Map<String,Object> roomInfo = new HashMap<>();
        boolean canChargeToRoom = false;
        if (room != null) {
            Room r = roomRepo.findByHotelIdAndRoomNumber(hotelId, room).orElse(null);
            if (r != null) {
                canChargeToRoom = r.getStatus() == RoomStatus.OCCUPIED;
                roomInfo.put("roomNumber", r.getRoomNumber());
                roomInfo.put("guestName", r.getGuestName());
                roomInfo.put("checkedIn", canChargeToRoom);
            }
        }

        Map<String,Object> out = new LinkedHashMap<>();
        out.put("hotelName", hotel.getName());
        out.put("hotelId", hotelId);
        out.put("room", roomInfo);
        out.put("canChargeToRoom", canChargeToRoom);
        out.put("outlets", outlets.stream().map(this::outletCard).collect(Collectors.toList()));
        out.put("scannedArea", area);
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    private Map<String,Object> outletCard(HotelOutlet o) {
        Map<String,Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("name", o.getName());
        m.put("type", o.getOutletType().name());
        m.put("description", o.getDescription());
        m.put("location", o.getLocation());
        m.put("shopId", o.getShopId());        // menu / ordering lives in shop-service
        m.put("bookable", o.getBookable());    // spa/activity/banquet use booking flow
        return m;
    }

    // ── 2. Guest raises a service request (housekeeping / amenities / concierge) ─
    @PostMapping("/{hotelId}/service-request")
    public ResponseEntity<ApiResponse<GuestServiceRequest>> raiseRequest(
            @PathVariable UUID hotelId,
            @RequestBody Map<String,Object> body) {

        String room = str(body.get("roomNumber"));
        if (room == null || room.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("roomNumber is required"));

        ServiceRequestType type;
        try { type = ServiceRequestType.valueOf(str(body.getOrDefault("type","HOUSEKEEPING")).toUpperCase()); }
        catch (Exception e) { type = ServiceRequestType.OTHER; }

        RequestPriority pri;
        try { pri = RequestPriority.valueOf(str(body.getOrDefault("priority","NORMAL")).toUpperCase()); }
        catch (Exception e) { pri = RequestPriority.NORMAL; }

        GuestServiceRequest req = GuestServiceRequest.builder()
            .hotelId(hotelId).roomNumber(room)
            .guestName(str(body.get("guestName")))
            .type(type).priority(pri)
            .details(str(body.get("details")))
            .status(RequestStatus.NEW)
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Request received", requestRepo.save(req)));
    }

    // ── 3. Guest books a slot at a bookable outlet (spa / activity / table) ──────
    @PostMapping("/{hotelId}/book")
    public ResponseEntity<ApiResponse<OutletBooking>> book(
            @PathVariable UUID hotelId,
            @RequestBody Map<String,Object> body) {

        String room = str(body.get("roomNumber"));
        UUID outletId;
        try { outletId = UUID.fromString(str(body.get("outletId"))); }
        catch (Exception e) { return ResponseEntity.badRequest().body(ApiResponse.error("valid outletId required")); }

        HotelOutlet outlet = outletRepo.findById(outletId).orElse(null);
        if (outlet == null) return ResponseEntity.badRequest().body(ApiResponse.error("outlet not found"));

        PaymentChoice pay;
        try { pay = PaymentChoice.valueOf(str(body.getOrDefault("paymentChoice","CHARGE_TO_ROOM")).toUpperCase()); }
        catch (Exception e) { pay = PaymentChoice.CHARGE_TO_ROOM; }

        // charge-to-room requires an occupied room
        if (pay == PaymentChoice.CHARGE_TO_ROOM && room != null) {
            Room r = roomRepo.findByHotelIdAndRoomNumber(hotelId, room).orElse(null);
            if (r == null || r.getStatus() != RoomStatus.OCCUPIED)
                return ResponseEntity.badRequest().body(
                    ApiResponse.error("Room not checked in — please choose Pay Direct"));
        }

        BigDecimal price = body.get("price") != null
            ? new BigDecimal(str(body.get("price"))) : BigDecimal.ZERO;

        OutletBooking booking = OutletBooking.builder()
            .hotelId(hotelId).outletId(outletId).outletName(outlet.getName())
            .roomNumber(room).guestName(str(body.get("guestName")))
            .guestPhone(str(body.get("guestPhone")))
            .serviceName(str(body.getOrDefault("serviceName","Booking")))
            .price(price)
            .bookingDate(str(body.get("bookingDate")))
            .bookingTime(str(body.get("bookingTime")))
            .partySize(body.get("partySize") != null ? Integer.parseInt(str(body.get("partySize"))) : 1)
            .notes(str(body.get("notes")))
            .paymentChoice(pay)
            .status(BookingStatus.REQUESTED)
            .build();
        booking = bookingRepo.save(booking);

        // If charging to room, immediately post a pending folio charge
        if (pay == PaymentChoice.CHARGE_TO_ROOM && price.compareTo(BigDecimal.ZERO) > 0 && room != null) {
            chargeRepo.save(RoomCharge.builder()
                .hotelId(hotelId).roomNumber(room).outletId(outletId)
                .guestName(booking.getGuestName())
                .amount(price)
                .description(outlet.getName() + " — " + booking.getServiceName())
                .status(RoomChargeStatus.PENDING)
                .paymentChoice(PaymentChoice.CHARGE_TO_ROOM)
                .build());
        }
        return ResponseEntity.ok(ApiResponse.ok("Booking requested", booking));
    }

    // ── 4. Guest views their running folio (all pending charges) ────────────────
    @GetMapping("/{hotelId}/folio")
    public ResponseEntity<ApiResponse<Map<String,Object>>> folio(
            @PathVariable UUID hotelId,
            @RequestParam String room) {

        List<RoomCharge> charges = chargeRepo.findByHotelIdAndRoomNumberOrderByCreatedAtDesc(hotelId, room);
        BigDecimal pending = charges.stream()
            .filter(c -> c.getStatus() == RoomChargeStatus.PENDING)
            .map(RoomCharge::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal settled = charges.stream()
            .filter(c -> c.getStatus() == RoomChargeStatus.SETTLED)
            .map(RoomCharge::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String,Object> out = new LinkedHashMap<>();
        out.put("roomNumber", room);
        out.put("charges", charges);
        out.put("pendingTotal", pending);
        out.put("settledTotal", settled);
        out.put("grandTotal", pending.add(settled));
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    // ── 5. Direct-pay charge (guest paid by card/UPI, record it as settled) ─────
    @PostMapping("/{hotelId}/pay-direct")
    public ResponseEntity<ApiResponse<RoomCharge>> payDirect(
            @PathVariable UUID hotelId,
            @RequestBody Map<String,Object> body) {

        String room = str(body.get("roomNumber"));
        BigDecimal amount = body.get("amount") != null
            ? new BigDecimal(str(body.get("amount"))) : BigDecimal.ZERO;

        RoomCharge charge = RoomCharge.builder()
            .hotelId(hotelId).roomNumber(room != null ? room : "WALK-IN")
            .guestName(str(body.get("guestName")))
            .amount(amount)
            .description(str(body.getOrDefault("description","Direct payment")))
            .status(RoomChargeStatus.SETTLED)        // paid now, so settled
            .settledAt(LocalDateTime.now())
            .paymentChoice(PaymentChoice.PAY_DIRECT)
            .paymentRef(str(body.get("paymentRef")))
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Payment recorded", chargeRepo.save(charge)));
    }

    private static String str(Object o) { return o == null ? null : o.toString(); }
}
