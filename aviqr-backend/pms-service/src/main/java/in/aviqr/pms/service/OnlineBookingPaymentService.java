package in.aviqr.pms.service;

import in.aviqr.pms.client.PaymentGatewayClient;
import in.aviqr.pms.dto.PublicBookingConfirmation;
import in.aviqr.pms.dto.PublicBookingRequest;
import in.aviqr.pms.dto.PublicPaymentOptions;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.BookingEngineSettingsRepository;
import in.aviqr.pms.repository.OnlinePaymentRepository;
import in.aviqr.pms.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/** Deposits and full payments taken online at booking, through the hotel's own gateway.
 *  The booking is made first; the payment is posted to its folio once payment-gateway-service
 *  reports it PAID. When the hotel requires the deposit, an unpaid booking is cancelled after
 *  PAYMENT_WINDOW_MINUTES so it doesn't hold rooms. */
@Service @RequiredArgsConstructor @Slf4j
public class OnlineBookingPaymentService {
    public static final int PAYMENT_WINDOW_MINUTES = 45;
    private static final Set<String> OPEN = Set.of("CREATED", "PENDING");

    private final BookingEngineSettingsRepository settingsRepo;
    private final OnlinePaymentRepository paymentRepo;
    private final ReservationRepository reservationRepo;
    private final PaymentGatewayClient gatewayClient;
    private final FolioService folioService;
    private final ReservationService reservationService;
    private final org.springframework.transaction.support.TransactionTemplate tx;

    public PublicPaymentOptions options(UUID hotelId) {
        BookingEngineSettings s = settingsRepo.findByHotelId(hotelId).orElse(null);
        if (s == null || s.getPaymentMode() == null || BookingEngineSettings.PAY_AT_HOTEL.equals(s.getPaymentMode())) return PublicPaymentOptions.AT_HOTEL;
        return gatewayClient.gatewayLabel(hotelId)
            .map(label -> new PublicPaymentOptions(s.getPaymentMode(), percent(s), label))
            .orElse(PublicPaymentOptions.AT_HOTEL);
    }

    /** Checks the guest's choice before anything is booked. */
    public String choice(UUID hotelId, PublicBookingRequest req) {
        PublicPaymentOptions o = options(hotelId);
        String option = req.getPaymentOption() == null ? "HOTEL" : req.getPaymentOption().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("HOTEL", "DEPOSIT", "FULL").contains(option)) throw new IllegalArgumentException("Unknown payment option");
        if ("PAY_AT_HOTEL".equals(o.mode())) {
            if (!"HOTEL".equals(option)) throw new IllegalArgumentException("This hotel doesn't take online payment");
            return option;
        }
        if ("REQUIRED".equals(o.mode()) && "HOTEL".equals(option)) throw new IllegalArgumentException("This hotel needs a deposit paid online to confirm the booking");
        if (!"HOTEL".equals(option) && (req.getPaymentReturnUrl() == null || req.getPaymentReturnUrl().isBlank()))
            throw new IllegalArgumentException("paymentReturnUrl is required for online payment");
        return option;
    }

    /** Starts the online payment for a new booking, or returns the one already started for a retried request. */
    public PublicBookingConfirmation.Payment start(Reservation reservation, String option, BigDecimal due, String currency,
                                                   PublicBookingRequest req) {
        if ("HOTEL".equals(option) || due.signum() <= 0) return null;
        Optional<OnlinePayment> existing = paymentRepo.findByReservationId(reservation.getId());
        if (existing.isPresent()) return view(existing.get(), gatewayClient.get(existing.get().getPaymentId()).map(PaymentGatewayClient.Payment::payUrl).orElse(null));
        PublicPaymentOptions o = options(reservation.getHotelId());
        BigDecimal amount = "FULL".equals(option) ? due
            : due.multiply(BigDecimal.valueOf(o.depositPercent())).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        PaymentGatewayClient.Payment p = gatewayClient.create(reservation.getHotelId(), amount, currency, reservation.getId(),
            ("FULL".equals(option) ? "Booking " : "Deposit for booking ") + reservation.getId().toString().substring(0, 8).toUpperCase(Locale.ROOT),
            req.getPaymentReturnUrl(), req.getGuestName(), req.getGuestEmail(), req.getGuestPhone());
        OnlinePayment saved = paymentRepo.save(OnlinePayment.builder().reservationId(reservation.getId()).hotelId(reservation.getHotelId())
            .paymentId(p.id()).paymentReference(p.reference()).gateway(p.gateway()).amount(p.amount()).currency(p.currency())
            .kind("FULL".equals(option) ? "FULL" : "DEPOSIT").required("REQUIRED".equals(o.mode())).status("CREATED").build());
        return view(saved, p.payUrl());
    }

    /** Reads the payment's result from payment-gateway-service and posts it to the folio once. */
    @Transactional
    public Optional<OnlinePayment> sync(UUID reservationId) {
        Optional<OnlinePayment> found = paymentRepo.findByReservationId(reservationId);
        found.ifPresent(this::refresh);
        return found;
    }

    /** Settles open payments the guest never came back from, and releases unpaid required bookings. */
    @Scheduled(fixedDelay = 300_000, initialDelay = 120_000)
    public void sweep() {
        for (OnlinePayment listed : paymentRepo.findByStatusIn(Set.of("CREATED", "PENDING", "FAILED"))) {
            try {
                tx.executeWithoutResult(status -> sweepOne(listed.getId()));
            } catch (Exception e) {
                log.warn("Online payment {} sweep failed: {}", listed.getId(), e.getMessage());
            }
        }
    }

    private void sweepOne(UUID id) {
        OnlinePayment p = paymentRepo.findById(id).orElse(null);
        if (p == null) return;
        refresh(p);
        boolean expired = p.getCreatedAt() != null && p.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(PAYMENT_WINDOW_MINUTES));
        if (Boolean.TRUE.equals(p.getRequired()) && expired && (OPEN.contains(p.getStatus()) || "FAILED".equals(p.getStatus()))) {
            reservationRepo.findById(p.getReservationId()).filter(r -> r.getStatus() == ReservationStatus.BOOKED).ifPresent(r -> {
                reservationService.cancel(r.getId());
                log.info("Cancelled booking {}: required online deposit not paid", r.getId());
            });
            p.setStatus("EXPIRED");
            p.setUpdatedAt(LocalDateTime.now());
            paymentRepo.save(p);
        } else if ("FAILED".equals(p.getStatus()) && !Boolean.TRUE.equals(p.getRequired())) {
            // Pay-at-hotel still applies; stop checking it.
            p.setStatus("FAILED_CLOSED");
            paymentRepo.save(p);
        }
    }

    private void refresh(OnlinePayment p) {
        if (Boolean.TRUE.equals(p.getPosted()) || "EXPIRED".equals(p.getStatus())) return;
        PaymentGatewayClient.Payment remote = gatewayClient.get(p.getPaymentId()).orElse(null);
        if (remote == null) return;
        if (!Objects.equals(remote.status(), p.getStatus())) {
            p.setStatus(remote.status());
            p.setUpdatedAt(LocalDateTime.now());
        }
        if ("PAID".equals(remote.status()) && !Boolean.TRUE.equals(p.getPosted())) {
            folioService.addPayment(p.getReservationId(), PaymentMethod.CARD, remote.amount(),
                "Online " + Objects.toString(p.getGateway(), "payment") + " " + p.getPaymentReference(), "web-booking-engine");
            p.setPosted(true);
        }
        paymentRepo.save(p);
    }

    private static int percent(BookingEngineSettings s) {
        Integer v = s.getDepositPercent();
        return v == null ? 100 : Math.max(1, Math.min(100, v));
    }

    private static PublicBookingConfirmation.Payment view(OnlinePayment p, String payUrl) {
        return new PublicBookingConfirmation.Payment(p.getPaymentId(), payUrl, p.getAmount(), p.getCurrency(), p.getKind(), Boolean.TRUE.equals(p.getRequired()));
    }
}
