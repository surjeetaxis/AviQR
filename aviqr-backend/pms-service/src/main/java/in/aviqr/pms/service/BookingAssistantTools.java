package in.aviqr.pms.service;

import in.aviqr.pms.dto.PublicBookingPolicies;
import in.aviqr.pms.dto.PublicDeal;
import in.aviqr.pms.dto.PublicPaymentOptions;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** What the booking assistant can look up: live rooms and prices, the hotel's policies and
 *  offers, and a booking link. Everything comes from the PMS, so the assistant never guesses a price. */
@Component @RequiredArgsConstructor
public class BookingAssistantTools {
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final AvailabilityService availabilityService;
    private final RatePlanService ratePlanService;
    private final PublicBookingService publicBookingService;
    private final OnlineBookingPaymentService onlinePayments;
    private final DealService dealService;
    private final BookingLoyaltyService loyalty;

    public Map<String, Object> availability(UUID hotelId, Map<String, Object> in) {
        LocalDate checkIn = date(in.get("check_in")), checkOut = date(in.get("check_out"));
        if (checkIn.isBefore(LocalDate.now(DealService.HOTEL_ZONE))) return Map.of("error", "check_in is in the past");
        if (!checkOut.isAfter(checkIn) || ChronoUnit.DAYS.between(checkIn, checkOut) > 30) return Map.of("error", "check_out must be 1-30 nights after check_in");
        int guests = Math.max(1, num(in.get("adults"), 2) + num(in.get("children"), 0));
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        List<Map<String, Object>> rooms = new ArrayList<>();
        BigDecimal cheapest = null;
        for (RoomType rt : roomTypeRepo.findByHotelIdAndActiveTrue(hotelId)) {
            int free = availabilityService.availableCount(hotelId, rt.getId(), checkIn, checkOut);
            if (free <= 0) continue;
            List<Map<String, Object>> rates = new ArrayList<>();
            for (RatePlan rp : ratePlanRepo.findByRoomTypeIdAndActiveTrue(rt.getId())) {
                try {
                    ratePlanService.validateStay(rp.getId(), checkIn, checkOut);
                } catch (RuntimeException restricted) {
                    continue;
                }
                BigDecimal total = ratePlanService.totalForStay(rp.getId(), checkIn, checkOut);
                if (cheapest == null || total.compareTo(cheapest) < 0) cheapest = total;
                Map<String, Object> rate = new LinkedHashMap<>();
                rate.put("rate", rp.getName());
                rate.put("meal_plan", rp.getMealPlan() == null ? "ROOM_ONLY" : rp.getMealPlan().name());
                rate.put("total_before_tax_inr", total);
                rate.put("per_night_inr", total.divide(BigDecimal.valueOf(nights), 0, java.math.RoundingMode.HALF_UP));
                if (rp.getCancellationPolicy() != null) rate.put("cancellation", rp.getCancellationPolicy());
                rates.add(rate);
            }
            if (rates.isEmpty()) continue;
            Map<String, Object> room = new LinkedHashMap<>();
            room.put("room_type", rt.getName());
            room.put("sleeps", rt.getMaxOccupancy() == null ? 2 : rt.getMaxOccupancy());
            room.put("rooms_left", free);
            if (rt.getDescription() != null) room.put("description", rt.getDescription());
            room.put("rates", rates);
            rooms.add(room);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("check_in", checkIn.toString());
        out.put("check_out", checkOut.toString());
        out.put("nights", nights);
        out.put("guests", guests);
        out.put("rooms", rooms);
        if (rooms.isEmpty()) out.put("note", "Nothing is available online for these dates");
        if (cheapest != null) dealService.best(hotelId, cheapest, checkIn, checkOut)
            .ifPresent(d -> out.put("deal_applied_at_checkout", d.name() + ": saves about INR " + d.discount() + " on the cheapest option"));
        out.put("prices_note", "Totals are before taxes and fees; checkout shows the full price");
        return out;
    }

    public Map<String, Object> hotelInfo(UUID hotelId) {
        Map<String, Object> out = new LinkedHashMap<>();
        PublicBookingPolicies p = publicBookingService.policies(hotelId);
        if (p.hotelPolicies() != null) out.put("house_rules", p.hotelPolicies());
        if (p.cancellationPolicy() != null) out.put("default_cancellation_policy", p.cancellationPolicy());
        if (p.termsAndConditions() != null) out.put("terms", p.termsAndConditions());
        PublicPaymentOptions pay = onlinePayments.options(hotelId);
        out.put("payment", switch (pay.mode()) {
            case "REQUIRED" -> "A " + pay.depositPercent() + "% deposit is paid online at booking; the rest at the hotel";
            case "OPTIONAL" -> "Pay at the hotel, or online at booking (deposit " + pay.depositPercent() + "% or in full)";
            default -> "Pay at the hotel; no card needed to book";
        });
        List<PublicDeal> deals = dealService.live(hotelId);
        if (!deals.isEmpty()) out.put("deals", deals.stream().map(d -> d.name() + (d.description() != null ? " (" + d.description() + ")" : "")
            + ": " + ("FIXED".equals(d.valueType()) ? "INR " + d.value() + " off" : d.value().stripTrailingZeros().toPlainString() + "% off")).toList());
        var program = loyalty.program(hotelId);
        if (program.active()) out.put("loyalty", "Stays earn " + program.earnRatePercent().stripTrailingZeros().toPlainString()
            + "% of the room price as points; points can be spent at checkout after confirming a code sent to the guest's email");
        out.put("group_bookings", "Groups of 10+ rooms or events can request a quote from the booking page");
        return out;
    }

    /** A link that opens the hotel's booking page with these dates and guests filled in. */
    public Map<String, Object> bookingLink(UUID hotelId, String storefrontBase, Map<String, Object> in) {
        LocalDate checkIn = date(in.get("check_in")), checkOut = date(in.get("check_out"));
        if (!checkOut.isAfter(checkIn)) return Map.of("error", "check_out must be after check_in");
        String url = storefrontBase.replaceAll("/+$", "") + "/#/stay/" + hotelId + "?in=" + checkIn + "&out=" + checkOut
            + "&adults=" + Math.max(1, num(in.get("adults"), 2)) + "&children=" + Math.max(0, num(in.get("children"), 0))
            + "&rooms=" + Math.max(1, Math.min(9, num(in.get("rooms"), 1)));
        return Map.of("url", url, "note", "The guest picks the room and finishes booking on this page");
    }

    private static LocalDate date(Object v) {
        try { return LocalDate.parse(String.valueOf(v)); }
        catch (DateTimeParseException e) { throw new IllegalArgumentException("Dates must be YYYY-MM-DD"); }
    }

    private static int num(Object v, int fallback) {
        if (v instanceof Number n) return n.intValue();
        try { return v == null ? fallback : Integer.parseInt(v.toString().trim()); }
        catch (NumberFormatException e) { return fallback; }
    }
}
