package in.aviqr.pms.service;

import in.aviqr.pms.config.RabbitMQConfig;
import in.aviqr.pms.entity.Waitlist;
import in.aviqr.pms.entity.WaitlistStatus;
import in.aviqr.pms.repository.WaitlistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** See Waitlist entity javadoc for the gap this closes. */
@Service @RequiredArgsConstructor @Slf4j
public class WaitlistService {

    private final WaitlistRepository waitlistRepo;
    private final AvailabilityService availabilityService;
    private final RabbitTemplate rabbitTemplate;

    public Waitlist join(UUID hotelId, UUID roomTypeId, String guestName, String guestPhone,
                          LocalDate checkIn, LocalDate checkOut) {
        if (!checkIn.isBefore(checkOut)) throw new RuntimeException("checkOutDate must be after checkInDate");
        return waitlistRepo.save(Waitlist.builder()
            .hotelId(hotelId).roomTypeId(roomTypeId).guestName(guestName).guestPhone(guestPhone)
            .checkInDate(checkIn).checkOutDate(checkOut).build());
    }

    public List<Waitlist> list(UUID hotelId) {
        return waitlistRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
    }

    /**
     * Called whenever a reservation frees up a room type (cancellation, no-show —
     * see ReservationService and ReservationLifecycleScheduler) — re-checks every
     * WAITING entry for that hotel+room type against its own desired dates (not the
     * dates that just freed up: freeing one stay can incidentally satisfy a
     * different waiting guest's different date range too) and notifies whoever now
     * has real availability.
     */
    public void checkAndNotify(UUID hotelId, UUID roomTypeId) {
        List<Waitlist> waiting = waitlistRepo.findByHotelIdAndRoomTypeIdAndStatus(hotelId, roomTypeId, WaitlistStatus.WAITING);
        for (Waitlist entry : waiting) {
            int available = availabilityService.availableCount(hotelId, roomTypeId, entry.getCheckInDate(), entry.getCheckOutDate());
            if (available <= 0) continue;

            entry.setStatus(WaitlistStatus.NOTIFIED);
            entry.setNotifiedAt(LocalDateTime.now());
            waitlistRepo.save(entry);

            rabbitTemplate.convertAndSend(RabbitMQConfig.HOTEL_EXCHANGE, "pms.waitlist.available", Map.of(
                "hotelId", hotelId.toString(),
                "guestName", entry.getGuestName() == null ? "" : entry.getGuestName(),
                "guestPhone", entry.getGuestPhone() == null ? "" : entry.getGuestPhone(),
                "checkInDate", entry.getCheckInDate().toString(),
                "checkOutDate", entry.getCheckOutDate().toString()
            ));
            log.info("Waitlist entry {} notified — room type {} now has {} available for {}..{}",
                entry.getId(), roomTypeId, available, entry.getCheckInDate(), entry.getCheckOutDate());
        }
    }
}
