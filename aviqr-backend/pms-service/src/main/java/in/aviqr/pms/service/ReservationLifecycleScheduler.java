package in.aviqr.pms.service;

import in.aviqr.pms.config.RabbitMQConfig;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationStatus;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.repository.RoomReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Daily hygiene + revenue-protection jobs — same enabled-flag + cron-property pattern
 * as ChannelSyncScheduler (this module) and payment-service's settlement job.
 */
@Component @RequiredArgsConstructor @Slf4j
public class ReservationLifecycleScheduler {

    private final ReservationRepository reservationRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final FolioService folioService;
    private final WaitlistService waitlistService;
    private final RabbitTemplate rabbitTemplate;

    @Value("${pms.noshow.job.enabled:true}")
    private boolean noShowEnabled;
    @Value("${pms.balancedue.job.enabled:true}")
    private boolean balanceDueEnabled;
    @Value("${pms.reviewinvite.job.enabled:true}")
    private boolean reviewInviteEnabled;
    @Value("${app.base-url:https://aviqr.com}")
    private String appBaseUrl;

    // A BOOKED reservation whose check-in date has already passed was never checked in
    // and never explicitly resolved by staff (cancelled/no-show) — auto-resolve it so
    // night audit/reporting and availability don't keep treating a stay that's never
    // going to happen as "upcoming". checkInDate < today (not "= yesterday") so a
    // backlog from any gap in this job running also gets caught up, not just the
    // newest day.
    @Scheduled(cron = "${pms.noshow.job.cron:0 15 2 * * *}")
    @Transactional
    public void autoMarkNoShows() {
        if (!noShowEnabled) return;
        LocalDate today = LocalDate.now();
        List<Reservation> overdue = reservationRepo.findByStatusAndCheckInDateBefore(ReservationStatus.BOOKED, today);
        for (Reservation r : overdue) {
            r.setStatus(ReservationStatus.NO_SHOW);
        }
        reservationRepo.saveAll(overdue);
        if (!overdue.isEmpty()) log.info("Auto-marked {} overdue BOOKED reservation(s) as NO_SHOW", overdue.size());
        for (Reservation r : overdue) {
            try {
                roomReservationRepo.findByReservationId(r.getId()).stream()
                    .map(RoomReservation::getRoomTypeId)
                    .distinct()
                    .forEach(roomTypeId -> waitlistService.checkAndNotify(r.getHotelId(), roomTypeId));
            } catch (Exception e) {
                log.warn("Waitlist check failed for auto-no-show reservation {}: {}", r.getId(), e.getMessage());
            }
        }
    }

    // A guest who checked out yesterday with an outstanding folio balance — one
    // follow-up reminder the day after, not a recurring nag every day it stays unpaid.
    @Scheduled(cron = "${pms.balancedue.job.cron:0 30 2 * * *}")
    public void sendBalanceDueReminders() {
        if (!balanceDueEnabled) return;
        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<Reservation> checkedOut = reservationRepo.findByStatusAndCheckOutDate(ReservationStatus.CHECKED_OUT, yesterday);
        int sent = 0;
        for (Reservation r : checkedOut) {
            Map<String, Object> folio = folioService.getFolio(r.getId());
            Object balanceObj = folio.get("balance");
            if (!(balanceObj instanceof BigDecimal balance) || balance.signum() <= 0) continue;

            rabbitTemplate.convertAndSend(RabbitMQConfig.HOTEL_EXCHANGE, "pms.balance-due", Map.of(
                "hotelId", r.getHotelId().toString(),
                "reservationId", r.getId().toString(),
                "guestName", r.getGuestName() == null ? "" : r.getGuestName(),
                "guestPhone", r.getGuestPhone() == null ? "" : r.getGuestPhone(),
                "balance", balance.toString(),
                "checkOutDate", r.getCheckOutDate().toString()
            ));
            sent++;
        }
        if (sent > 0) log.info("Published {} balance-due reminder event(s)", sent);
    }

    // A guest who checked out yesterday gets one review-invite link the day after —
    // same cadence as the balance-due reminder, but unconditional (every checkout,
    // not just ones with an outstanding balance).
    @Scheduled(cron = "${pms.reviewinvite.job.cron:0 40 2 * * *}")
    public void sendReviewInvites() {
        if (!reviewInviteEnabled) return;
        LocalDate yesterday = LocalDate.now().minusDays(1);
        List<Reservation> checkedOut = reservationRepo.findByStatusAndCheckOutDate(ReservationStatus.CHECKED_OUT, yesterday);
        int sent = 0;
        for (Reservation r : checkedOut) {
            if (r.getGuestPhone() == null || r.getGuestPhone().isBlank()) continue;
            String reviewLink = appBaseUrl + "/review/" + r.getHotelId() + "?reservationId=" + r.getId()
                + "&guestName=" + URLEncoder.encode(
                    r.getGuestName() == null ? "" : r.getGuestName(), StandardCharsets.UTF_8);

            rabbitTemplate.convertAndSend(RabbitMQConfig.HOTEL_EXCHANGE, "pms.review-invite", Map.of(
                "hotelId", r.getHotelId().toString(),
                "reservationId", r.getId().toString(),
                "guestName", r.getGuestName() == null ? "" : r.getGuestName(),
                "guestPhone", r.getGuestPhone(),
                "reviewLink", reviewLink
            ));
            sent++;
        }
        if (sent > 0) log.info("Published {} review-invite event(s)", sent);
    }
}
