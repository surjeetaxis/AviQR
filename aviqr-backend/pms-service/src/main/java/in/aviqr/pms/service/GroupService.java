package in.aviqr.pms.service;

import in.aviqr.pms.entity.FolioPayment;
import in.aviqr.pms.entity.PaymentMethod;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationGroup;
import in.aviqr.pms.entity.ReservationStatus;
import in.aviqr.pms.repository.ReservationGroupRepository;
import in.aviqr.pms.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** A ReservationGroup is a label over several ordinary Reservations (see
 *  Reservation.groupId) — group actions just fan out to each member's existing,
 *  already-tested reservation logic rather than duplicating it. */
@Service @RequiredArgsConstructor
public class GroupService {

    private final ReservationGroupRepository groupRepo;
    private final ReservationRepository reservationRepo;
    private final ReservationService reservationService;
    private final FolioService folioService;

    public ReservationGroup create(ReservationGroup req, String createdBy) {
        req.setId(null);
        req.setCreatedBy(createdBy);
        return groupRepo.save(req);
    }

    public List<ReservationGroup> listForHotel(UUID hotelId) {
        return groupRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
    }

    public ReservationGroup get(UUID id) {
        return groupRepo.findById(id).orElseThrow(() -> new RuntimeException("Group not found: " + id));
    }

    public List<Reservation> members(UUID groupId) {
        return reservationRepo.findByGroupIdOrderByCreatedAtAsc(groupId);
    }

    /** Bulk check-in every BOOKED member — resilient to a single bad member (e.g.
     *  already cancelled) rather than aborting the whole group's arrival. */
    public Map<String, Object> checkInAll(UUID groupId) {
        return bulk(groupId, ReservationStatus.BOOKED, reservationService::checkIn);
    }

    public Map<String, Object> checkOutAll(UUID groupId) {
        return bulk(groupId, ReservationStatus.CHECKED_IN, reservationService::checkOut);
    }

    private Map<String, Object> bulk(UUID groupId, ReservationStatus expected, java.util.function.Function<UUID, Reservation> action) {
        List<UUID> succeeded = new ArrayList<>();
        List<Map<String, String>> failed = new ArrayList<>();
        for (Reservation r : members(groupId)) {
            if (r.getStatus() != expected) continue;
            try {
                action.apply(r.getId());
                succeeded.add(r.getId());
            } catch (Exception e) {
                failed.add(Map.of("reservationId", r.getId().toString(), "error", e.getMessage()));
            }
        }
        return Map.of("succeeded", succeeded, "failed", failed);
    }

    /** Aggregates every member reservation's folio plus any payments recorded directly
     *  against the group (the organizer settling the whole block in one go). */
    public Map<String, Object> groupFolio(UUID groupId) {
        List<Reservation> members = members(groupId);
        BigDecimal totalCharges = BigDecimal.ZERO;
        BigDecimal totalPayments = BigDecimal.ZERO;
        List<Map<String, Object>> perReservation = new ArrayList<>();

        for (Reservation r : members) {
            Map<String, Object> folio = folioService.getFolio(r.getId());
            BigDecimal charges = (BigDecimal) folio.get("totalCharges");
            BigDecimal payments = (BigDecimal) folio.get("totalPayments");
            totalCharges = totalCharges.add(charges);
            totalPayments = totalPayments.add(payments);
            perReservation.add(Map.of(
                "reservationId", r.getId(), "guestName", r.getGuestName() == null ? "" : r.getGuestName(),
                "totalCharges", charges, "totalPayments", payments));
        }

        List<FolioPayment> groupPayments = folioService.groupPayments(groupId);
        BigDecimal groupPaymentsTotal = groupPayments.stream().map(FolioPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        totalPayments = totalPayments.add(groupPaymentsTotal);

        return Map.of(
            "reservations", perReservation,
            "groupPayments", groupPayments,
            "totalCharges", totalCharges,
            "totalPayments", totalPayments,
            "balance", totalCharges.subtract(totalPayments));
    }

    public FolioPayment addGroupPayment(UUID groupId, PaymentMethod method, BigDecimal amount, String reference, String createdBy) {
        return folioService.addGroupPayment(groupId, method, amount, reference, createdBy);
    }
}
