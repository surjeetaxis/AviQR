package in.aviqr.pms.service;

import in.aviqr.pms.entity.Agent;
import in.aviqr.pms.entity.CommissionStatus;
import in.aviqr.pms.entity.ReservationCommission;
import in.aviqr.pms.repository.AgentRepository;
import in.aviqr.pms.repository.ReservationCommissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class CommissionService {

    private final ReservationCommissionRepository commissionRepo;
    private final AgentRepository agentRepo;

    /** Snapshots the agent's current default rate (or an explicit override) against the
     *  booking's quoted room revenue — see ReservationCommission for why this is
     *  snapshotted rather than computed live off the agent's rate. */
    public ReservationCommission recordForBooking(UUID hotelId, UUID reservationId, UUID agentId,
                                                   BigDecimal roomRevenue, BigDecimal percentOverride) {
        Agent agent = agentRepo.findById(agentId).orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));
        BigDecimal percent = percentOverride != null ? percentOverride : agent.getCommissionPercent();
        BigDecimal amount = roomRevenue.multiply(percent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal tdsPercent = agent.getTdsPercent() != null ? agent.getTdsPercent() : BigDecimal.ZERO;
        BigDecimal tdsAmount = amount.multiply(tdsPercent).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        return commissionRepo.save(ReservationCommission.builder()
            .hotelId(hotelId).reservationId(reservationId).agentId(agentId)
            .commissionPercent(percent).roomRevenue(roomRevenue).commissionAmount(amount)
            .tdsPercent(tdsPercent).tdsAmount(tdsAmount).netPayable(amount.subtract(tdsAmount))
            .build());
    }

    /** A cancelled or no-show booking never delivered real room revenue, so any
     *  commission booked against it at creation time is voided, not paid. */
    public void voidForReservation(UUID reservationId) {
        commissionRepo.findByReservationId(reservationId).ifPresent(c -> {
            if (c.getStatus() == CommissionStatus.PENDING) {
                c.setStatus(CommissionStatus.VOID);
                commissionRepo.save(c);
            }
        });
    }

    public List<ReservationCommission> listForHotel(UUID hotelId, CommissionStatus status) {
        return status != null
            ? commissionRepo.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, status)
            : commissionRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
    }

    public List<ReservationCommission> listForAgent(UUID agentId) {
        return commissionRepo.findByAgentIdOrderByCreatedAtDesc(agentId);
    }

    public ReservationCommission get(UUID id) {
        return commissionRepo.findById(id).orElseThrow(() -> new RuntimeException("Commission not found: " + id));
    }

    public ReservationCommission markPaid(UUID id, String paidBy, String paidReference) {
        ReservationCommission c = get(id);
        if (c.getStatus() != CommissionStatus.PENDING)
            throw new RuntimeException("Only a PENDING commission can be marked paid");
        c.setStatus(CommissionStatus.PAID);
        c.setPaidAt(LocalDateTime.now());
        c.setPaidBy(paidBy);
        c.setPaidReference(paidReference);
        return commissionRepo.save(c);
    }
}
