package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.NotificationClient;
import in.aviqr.pms.dto.PublicVoucher;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Guest booking vouchers (confirmations) for the public booking engine: the voucher,
 *  finding a booking by reference + phone, and the confirmation email linking back to
 *  it. Not to be confused with VoucherService, which handles prepaid gift vouchers. */
@Service @RequiredArgsConstructor
public class BookingVoucherService {
    static final int MAX_EMAILS_PER_HOUR = 3;

    private final ReservationRepository reservationRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final FolioChargeRepository chargeRepo;
    private final GuestRepository guestRepo;
    private final HotelServiceClient hotelServiceClient;
    private final NotificationClient notificationClient;
    private final PublicBookingService publicBookingService;
    private final VoucherTokens tokens;
    private final Map<UUID, Deque<Instant>> recentEmails = new ConcurrentHashMap<>();

    @Value("${booking.engine.public-url:https://bm.aviqr.com}")
    private String publicStorefrontUrl;

    public static String reference(UUID reservationId) {
        return reservationId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    public String tokenFor(UUID reservationId) { return tokens.tokenFor(reservationId); }

    /** Empty unless the reservation belongs to the hotel and the token matches. */
    public Optional<PublicVoucher> voucher(UUID hotelId, UUID reservationId, String token) {
        if (!tokens.matches(reservationId, token)) return Optional.empty();
        return reservationRepo.findById(reservationId).filter(r -> hotelId.equals(r.getHotelId())).map(this::build);
    }

    /** The guest's own booking when the reference and phone both match; the phone check
     *  compares the last 10 digits so "+91 98…" and "98…" are the same number. */
    public Optional<Reservation> find(String reference, String phone) {
        String ref = reference == null ? "" : reference.trim().toLowerCase(Locale.ROOT);
        String digits = lastDigits(phone);
        if (!ref.matches("[0-9a-f]{8}") || digits.length() < 7) return Optional.empty();
        return reservationRepo.findByReferencePrefix(ref).stream()
            .filter(r -> digits.equals(lastDigits(r.getGuestPhone()))).findFirst();
    }

    /** Emails the voucher to the guest's address on file. False when there is none or the
     *  hourly limit for this booking is reached; never throws. */
    public boolean email(UUID reservationId, String storefrontHost) {
        Reservation r = reservationRepo.findById(reservationId).orElse(null);
        String to = r == null ? null : guestEmail(r);
        if (to == null || !allowEmail(reservationId)) return false;
        PublicVoucher v = build(r);
        Map<String, Object> hotel = hotelServiceClient.bookingEngineProperty(r.getHotelId(), storefrontHost, "");
        String hotelName = String.valueOf(hotel.getOrDefault("name", "your hotel"));
        String link = hotelServiceClient.registeredStorefront(r.getHotelId(), storefrontHost).orElse(publicStorefrontUrl)
            + "/#/voucher/" + r.getHotelId() + "/" + r.getId() + "/" + v.voucherToken();
        return notificationClient.sendEmail(to, "Booking confirmed · " + hotelName + " · " + v.reference(), emailHtml(v, hotel, link));
    }

    PublicVoucher build(Reservation r) {
        long nights = Math.max(1, ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate()));
        List<RoomReservation> lines = roomReservationRepo.findByReservationId(r.getId());
        Map<UUID, HotelRoomDto> physical;
        try {
            physical = hotelServiceClient.getRooms(r.getHotelId()).stream()
                .collect(Collectors.toMap(HotelRoomDto::getId, Function.identity(), (a, b) -> a));
        } catch (Exception e) {
            physical = Map.of(); // the voucher still renders without side/view details
        }
        List<PublicVoucher.Room> rooms = new ArrayList<>();
        BigDecimal roomTotal = BigDecimal.ZERO;
        for (RoomReservation line : lines) {
            RoomType type = roomTypeRepo.findById(line.getRoomTypeId()).orElse(null);
            RatePlan plan = line.getRatePlanId() == null ? null : ratePlanRepo.findById(line.getRatePlanId()).orElse(null);
            HotelRoomDto room = line.getRoomId() == null ? null : physical.get(line.getRoomId());
            BigDecimal rate = line.getRatePerNight() == null ? BigDecimal.ZERO : line.getRatePerNight();
            roomTotal = roomTotal.add(rate.multiply(BigDecimal.valueOf(nights)));
            rooms.add(new PublicVoucher.Room(type == null ? "Room" : type.getName(), plan == null ? null : plan.getName(),
                plan == null || plan.getMealPlan() == null ? null : plan.getMealPlan().name(), plan == null ? null : plan.getCancellationPolicy(),
                room == null ? null : room.getFloor(), room == null ? null : room.getRoomSide(), room == null ? null : room.getViewType(), rate));
        }
        List<FolioCharge> charges = chargeRepo.findByReservationIdOrderByCreatedAtAsc(r.getId());
        List<PublicVoucher.Charge> extras = charges.stream()
            .filter(c -> c.getType() == FolioChargeType.ADDON || c.getType() == FolioChargeType.DISCOUNT)
            .map(c -> new PublicVoucher.Charge(c.getType().name(), c.getDescription(), c.getAmount())).toList();
        BigDecimal extrasTotal = extras.stream().map(PublicVoucher.Charge::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal discount = extras.stream().filter(c -> "DISCOUNT".equals(c.type())).map(PublicVoucher.Charge::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add).negate();
        BigDecimal postedTaxes = charges.stream().filter(c -> c.getType() == FolioChargeType.SURCHARGE).map(FolioCharge::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean estimated = postedTaxes.signum() == 0;
        BigDecimal taxes = estimated
            ? publicBookingService.estimatedTaxes(r.getHotelId(), roomTotal.subtract(discount).max(BigDecimal.ZERO), nights) : postedTaxes;
        return new PublicVoucher(r.getId(), reference(r.getId()), r.getHotelId(), r.getStatus().name(), r.getGuestName(),
            r.getCheckInDate(), r.getCheckOutDate(), r.getAdults(), r.getChildren(), specialRequests(r.getNotes()), rooms, extras,
            roomTotal, extrasTotal, taxes, estimated, roomTotal.add(extrasTotal).add(taxes).max(BigDecimal.ZERO), "INR",
            r.getCreatedAt(), tokens.tokenFor(r.getId()), maskEmail(guestEmail(r)));
    }

    private String guestEmail(Reservation r) {
        if (r.getGuestId() == null) return null;
        return guestRepo.findById(r.getGuestId()).map(Guest::getEmail).filter(e -> e != null && e.contains("@")).orElse(null);
    }

    private boolean allowEmail(UUID reservationId) {
        Deque<Instant> sent = recentEmails.computeIfAbsent(reservationId, k -> new ArrayDeque<>());
        synchronized (sent) {
            Instant hourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
            while (!sent.isEmpty() && sent.peekFirst().isBefore(hourAgo)) sent.pollFirst();
            if (sent.size() >= MAX_EMAILS_PER_HOUR) return false;
            sent.addLast(Instant.now());
            return true;
        }
    }

    static String specialRequests(String notes) {
        if (notes == null) return null;
        return notes.lines().filter(l -> l.startsWith("Guest request: ")).map(l -> l.substring("Guest request: ".length()))
            .findFirst().orElse(null);
    }

    static String maskEmail(String email) {
        if (email == null) return null;
        int at = email.indexOf('@');
        return at <= 1 ? "***" + email.substring(Math.max(at, 0)) : email.charAt(0) + "***" + email.substring(at);
    }

    static String lastDigits(String phone) {
        String d = phone == null ? "" : phone.replaceAll("\\D", "");
        return d.length() > 10 ? d.substring(d.length() - 10) : d;
    }

    static String esc(Object value) {
        return value == null ? "" : String.valueOf(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("\"", "&quot;").replace("'", "&#39;");
    }

    static String emailHtml(PublicVoucher v, Map<String, Object> hotel, String link) {
        DateTimeFormatter day = DateTimeFormatter.ofPattern("EEE, d MMM yyyy", Locale.ENGLISH);
        StringBuilder rooms = new StringBuilder();
        int i = 1;
        for (PublicVoucher.Room room : v.rooms()) {
            String where = String.join(" · ", Arrays.stream(new String[]{room.floor(), room.side(), room.view()}).filter(Objects::nonNull).toList());
            rooms.append("<tr><td style=\"padding:6px 0\"><b>Room ").append(i++).append(" · ").append(esc(room.roomType()))
                .append("</b><br><span style=\"color:#66736c\">").append(esc(room.ratePlan()))
                .append(where.isEmpty() ? "" : " · " + esc(where)).append("</span></td></tr>");
        }
        StringBuilder money = new StringBuilder(row("Rooms", v.roomTotal()));
        for (PublicVoucher.Charge c : v.extras()) money.append(row(esc(c.description()), c.amount()));
        money.append(row(v.taxesEstimated() ? "Taxes &amp; fees (est.)" : "Taxes &amp; fees", v.taxes()));
        String address = String.join(", ", Arrays.stream(new Object[]{hotel.get("address"), hotel.get("city")})
            .filter(Objects::nonNull).map(String::valueOf).toList());
        return "<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18241f\">"
            + "<p style=\"font-size:12px;letter-spacing:2px;color:#1f7257;font-weight:bold\">BOOKING CONFIRMED</p>"
            + "<h2 style=\"margin:4px 0 2px\">" + esc(hotel.getOrDefault("name", "Your stay")) + "</h2>"
            + "<p style=\"margin:0;color:#66736c\">" + esc(address) + "</p>"
            + "<p>Hi " + esc(v.guestName()) + ", your reservation is confirmed. Show this reference at check-in:</p>"
            + "<p style=\"font-size:26px;letter-spacing:4px;font-weight:bold;border:2px dashed #1f7257;display:inline-block;padding:8px 18px\">"
            + esc(v.reference()) + "</p>"
            + "<p><b>Check-in:</b> " + v.checkInDate().format(day) + (hotel.get("checkInTime") != null ? " from " + esc(hotel.get("checkInTime")) : "")
            + "<br><b>Check-out:</b> " + v.checkOutDate().format(day) + (hotel.get("checkOutTime") != null ? " by " + esc(hotel.get("checkOutTime")) : "")
            + "<br><b>Guests:</b> " + v.adults() + " adults" + (v.children() != null && v.children() > 0 ? ", " + v.children() + " children" : "") + "</p>"
            + "<table style=\"width:100%;border-collapse:collapse\">" + rooms + "</table>"
            + "<table style=\"width:100%;border-collapse:collapse;margin-top:10px;background:#eef3ee\">" + money
            + "<tr><td style=\"padding:8px 10px;font-weight:bold\">Pay at the hotel</td><td style=\"padding:8px 10px;text-align:right;font-weight:bold\">₹"
            + v.grandTotal().toPlainString() + "</td></tr></table>"
            + (v.specialRequests() != null ? "<p><b>Your request:</b> " + esc(v.specialRequests()) + "</p>" : "")
            + "<p style=\"margin:22px 0\"><a href=\"" + esc(link) + "\" style=\"background:#1f7257;color:#fff;padding:12px 20px;border-radius:999px;"
            + "text-decoration:none;font-weight:bold\">View or download your voucher</a></p>"
            + "<p style=\"font-size:12px;color:#66736c\">The voucher has a QR code the front desk can scan at check-in.</p></div>";
    }

    private static String row(String label, BigDecimal amount) {
        return "<tr><td style=\"padding:6px 10px\">" + label + "</td><td style=\"padding:6px 10px;text-align:right\">"
            + (amount.signum() < 0 ? "− ₹" + amount.negate().toPlainString() : "₹" + amount.toPlainString()) + "</td></tr>";
    }
}
