package in.aviqr.pms.service;

import in.aviqr.pms.dto.CreateReservationRequest;
import in.aviqr.pms.dto.PublicBookingConfirmation;
import in.aviqr.pms.dto.PublicBookingExtras;
import in.aviqr.pms.dto.PublicBookingRequest;
import in.aviqr.pms.dto.PublicBookingPolicies;
import in.aviqr.pms.dto.PublicPromoQuote;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** The public booking engine's checkout: one DIRECT reservation for one or more
 *  rooms, plus the guest's add-ons and promo code, created atomically. Prices are
 *  recomputed here from the rate plans, never trusted from the storefront. */
@Service @RequiredArgsConstructor
public class PublicBookingService {

    public static final int MAX_ROOMS = 9;
    public static final int MAX_ADDON_QUANTITY = 20;

    private final ReservationService reservationService;
    private final ReservationRepository reservationRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final RatePlanService ratePlanService;
    private final AddOnRepository addOnRepo;
    private final SurchargeRepository surchargeRepo;
    private final DiscountPackageRepository discountRepo;
    private final PromoCodeRepository promoRepo;
    private final FolioService folioService;
    private final VoucherRepository voucherRepo;
    private final VoucherService voucherService;
    private final FolioPaymentRepository paymentRepo;
    private final BookingEngineSettingsRepository settingsRepo;

    public PublicBookingPolicies policies(UUID hotelId) {
        return settingsRepo.findByHotelId(hotelId)
            .map(s -> new PublicBookingPolicies(s.getHotelPolicies(), s.getCancellationPolicy(), s.getTermsAndConditions(), s.termsRequired()))
            .orElse(PublicBookingPolicies.NONE);
    }

    public PublicBookingExtras extras(UUID hotelId) {
        return new PublicBookingExtras(
            addOnRepo.findByHotelIdAndActiveTrue(hotelId).stream()
                .map(a -> new PublicBookingExtras.AddOnOption(a.getId(), a.getName(), a.getDescription(), a.getPrice())).toList(),
            surchargeRepo.findByHotelIdAndActiveTrue(hotelId).stream()
                .map(s -> new PublicBookingExtras.TaxLine(s.getName(), s.getValueType().name(), s.getValue())).toList());
    }

    /** Empty when the code is unknown, inactive, outside its dates, or its discount package is gone. */
    public Optional<PublicPromoQuote> promo(UUID hotelId, String code, BigDecimal roomTotal, LocalDate checkIn) {
        if (code == null || code.isBlank()) return Optional.empty();
        return promoRepo.findByHotelIdAndCodeIgnoreCase(hotelId, code.trim().toUpperCase(Locale.ROOT))
            .filter(p -> p.validOn(checkIn != null ? checkIn : LocalDate.now()))
            .flatMap(p -> discountRepo.findById(p.getDiscountPackageId())
                .filter(d -> hotelId.equals(d.getHotelId()) && Boolean.TRUE.equals(d.getActive()))
                .map(d -> new PublicPromoQuote(p.getCode(), d.getName(), d.getValueType().name(), d.getValue(),
                    discountOn(d, roomTotal == null ? BigDecimal.ZERO : roomTotal))));
    }

    @Transactional
    public PublicBookingConfirmation book(UUID hotelId, PublicBookingRequest req) {
        List<PublicBookingRequest.RoomLine> lines = req.roomLines();
        if (req.getGuestName() == null || req.getGuestName().isBlank() || req.getGuestPhone() == null || req.getGuestPhone().isBlank())
            throw new IllegalArgumentException("Name and phone are required");
        if (req.getCheckInDate() == null || req.getCheckOutDate() == null || !req.getCheckOutDate().isAfter(req.getCheckInDate()))
            throw new IllegalArgumentException("Check-out must be after check-in");
        if (lines.isEmpty() || lines.size() > MAX_ROOMS)
            throw new IllegalArgumentException("Choose between 1 and " + MAX_ROOMS + " rooms");
        if (!Boolean.TRUE.equals(req.getTermsAccepted()) && policies(hotelId).termsRequired())
            throw new IllegalArgumentException("Please accept the hotel's terms and conditions");

        long nights = ChronoUnit.DAYS.between(req.getCheckInDate(), req.getCheckOutDate());
        BigDecimal roomTotal = BigDecimal.ZERO;
        int capacity = 0;
        for (PublicBookingRequest.RoomLine line : lines) {
            RoomType type = roomTypeRepo.findById(line.getRoomTypeId()).orElse(null);
            RatePlan plan = line.getRatePlanId() == null ? null : ratePlanRepo.findById(line.getRatePlanId()).orElse(null);
            if (type == null || plan == null || !hotelId.equals(type.getHotelId()) || !hotelId.equals(plan.getHotelId())
                    || !type.getId().equals(plan.getRoomTypeId()) || !Boolean.TRUE.equals(type.getActive()) || !Boolean.TRUE.equals(plan.getActive()))
                throw new IllegalArgumentException("Invalid room or rate plan");
            capacity += type.getMaxOccupancy() == null ? 2 : type.getMaxOccupancy();
            roomTotal = roomTotal.add(ratePlanService.totalForStay(plan.getId(), req.getCheckInDate(), req.getCheckOutDate()));
        }
        int guests = (req.getAdults() == null ? 1 : req.getAdults()) + (req.getChildren() == null ? 0 : req.getChildren());
        if (guests > capacity) throw new IllegalArgumentException("These rooms sleep up to " + capacity + " guests");

        List<AddOn> addOns = new ArrayList<>();
        List<Integer> quantities = new ArrayList<>();
        for (PublicBookingRequest.AddOnLine a : Optional.ofNullable(req.getAddOns()).orElse(List.of())) {
            int qty = a.getQuantity() == null ? 1 : a.getQuantity();
            if (qty <= 0) continue;
            AddOn addOn = a.getAddOnId() == null ? null : addOnRepo.findById(a.getAddOnId()).orElse(null);
            if (addOn == null || !hotelId.equals(addOn.getHotelId()) || !Boolean.TRUE.equals(addOn.getActive()) || qty > MAX_ADDON_QUANTITY)
                throw new IllegalArgumentException("Invalid add-on");
            addOns.add(addOn);
            quantities.add(qty);
        }
        Voucher gift = null;
        if (req.getGiftVoucherCode() != null && !req.getGiftVoucherCode().isBlank()) {
            gift = giftVoucher(hotelId, req.getGiftVoucherCode())
                .orElseThrow(() -> new IllegalArgumentException("That gift voucher isn't valid or has no balance left"));
        }
        PublicPromoQuote promo = null;
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank()) {
            promo = promo(hotelId, req.getPromoCode(), roomTotal, req.getCheckInDate())
                .orElseThrow(() -> new IllegalArgumentException("That promo code isn't valid for this stay"));
        }

        // A retried request returns the original booking without posting extras again.
        boolean retry = req.getBookingRequestId() != null
            && reservationRepo.findByBookingRequestId(req.getBookingRequestId().toString()).isPresent();

        CreateReservationRequest cr = new CreateReservationRequest();
        cr.setHotelId(hotelId);
        cr.setGuestName(req.getGuestName().trim());
        cr.setGuestPhone(req.getGuestPhone().trim());
        cr.setGuestEmail(req.getGuestEmail());
        cr.setCheckInDate(req.getCheckInDate());
        cr.setCheckOutDate(req.getCheckOutDate());
        cr.setAdults(req.getAdults());
        cr.setChildren(req.getChildren());
        cr.setSource(ReservationSource.DIRECT);
        cr.setBookingRequestId(req.getBookingRequestId());
        cr.setNotes(notes(req));
        cr.setRooms(lines.stream().map(l -> {
            CreateReservationRequest.RoomBooking rb = new CreateReservationRequest.RoomBooking();
            rb.setRoomTypeId(l.getRoomTypeId());
            rb.setRatePlanId(l.getRatePlanId());
            rb.setRoomId(l.getRoomId());
            return rb;
        }).toList());
        Reservation reservation = reservationService.create(cr, "web-booking-engine");

        BigDecimal addOnTotal = BigDecimal.ZERO;
        for (int i = 0; i < addOns.size(); i++) {
            addOnTotal = addOnTotal.add(addOns.get(i).getPrice().multiply(BigDecimal.valueOf(quantities.get(i))));
            if (!retry) {
                String label = quantities.get(i) > 1 ? addOns.get(i).getName() + " x" + quantities.get(i) : addOns.get(i).getName();
                folioService.addCharge(reservation.getId(), null, FolioChargeType.ADDON, label,
                    addOns.get(i).getPrice().multiply(BigDecimal.valueOf(quantities.get(i))));
            }
        }
        BigDecimal discount = promo == null ? BigDecimal.ZERO : promo.discount();
        if (promo != null && !retry && discount.signum() > 0)
            folioService.addCharge(reservation.getId(), null, FolioChargeType.DISCOUNT, promo.name() + " (" + promo.code() + ")", discount.negate());

        BigDecimal taxes = estimatedTaxes(hotelId, roomTotal.subtract(discount).max(BigDecimal.ZERO), nights);
        BigDecimal grand = roomTotal.add(addOnTotal).subtract(discount).add(taxes).max(BigDecimal.ZERO);
        // A gift voucher pays what it can of the stay now; the rest is paid at the hotel.
        BigDecimal voucherApplied = BigDecimal.ZERO;
        if (gift != null && !retry) {
            voucherApplied = gift.getBalance().min(grand);
            if (voucherApplied.signum() > 0) {
                voucherService.redeem(hotelId, gift.getCode(), voucherApplied);
                folioService.addPayment(reservation.getId(), PaymentMethod.VOUCHER, voucherApplied, gift.getCode(), "web-booking-engine");
            }
        } else if (retry) {
            voucherApplied = paymentRepo.findByReservationIdOrderByCreatedAtAsc(reservation.getId()).stream()
                .filter(p -> p.getMethod() == PaymentMethod.VOUCHER).map(FolioPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        return PublicBookingConfirmation.from(reservation, lines.size(), new PublicBookingConfirmation.Totals(
            roomTotal, addOnTotal, discount, taxes, grand, "INR", voucherApplied, grand.subtract(voucherApplied).max(BigDecimal.ZERO)));
    }

    /** An active gift voucher of this hotel with balance left; codes match as entered or upper-cased. */
    public Optional<Voucher> giftVoucher(UUID hotelId, String code) {
        if (code == null || code.isBlank() || code.trim().length() > 40) return Optional.empty();
        String c = code.trim();
        return voucherRepo.findByHotelIdAndCode(hotelId, c).or(() -> voucherRepo.findByHotelIdAndCode(hotelId, c.toUpperCase(Locale.ROOT)))
            .filter(v -> Boolean.TRUE.equals(v.getActive()) && v.getBalance() != null && v.getBalance().signum() > 0);
    }

    /** Same formula SurchargeService applies at check-in. */
    public BigDecimal estimatedTaxes(UUID hotelId, BigDecimal roomRevenue, long nights) {
        BigDecimal total = BigDecimal.ZERO;
        for (Surcharge s : surchargeRepo.findByHotelIdAndActiveTrue(hotelId)) {
            total = total.add(s.getValueType() == ValueType.FIXED
                ? s.getValue().multiply(BigDecimal.valueOf(nights))
                : roomRevenue.multiply(s.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        }
        return total;
    }

    private static BigDecimal discountOn(DiscountPackage d, BigDecimal roomTotal) {
        BigDecimal amount = d.getValueType() == ValueType.FIXED ? d.getValue()
            : roomTotal.multiply(d.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return amount.min(roomTotal).max(BigDecimal.ZERO);
    }

    private static String notes(PublicBookingRequest req) {
        List<String> parts = new ArrayList<>();
        if (req.getSpecialRequests() != null && !req.getSpecialRequests().isBlank())
            parts.add("Guest request: " + req.getSpecialRequests().trim());
        if (req.getGuestEmail() != null && !req.getGuestEmail().isBlank())
            parts.add("Email: " + req.getGuestEmail().trim());
        if (Boolean.TRUE.equals(req.getTermsAccepted()))
            parts.add("Accepted booking terms");
        if (req.getPromoCode() != null && !req.getPromoCode().isBlank())
            parts.add("Promo: " + req.getPromoCode().trim().toUpperCase(Locale.ROOT));
        String text = String.join("\n", parts);
        // pms_reservations.notes is varchar(255)
        return text.isEmpty() ? null : text.substring(0, Math.min(text.length(), 255));
    }
}
