package in.aviqr.pms.service;

import in.aviqr.pms.entity.FolioCharge;
import in.aviqr.pms.entity.FolioChargeType;
import in.aviqr.pms.entity.FolioPayment;
import in.aviqr.pms.entity.PaymentMethod;
import in.aviqr.pms.repository.FolioChargeRepository;
import in.aviqr.pms.repository.FolioPaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class FolioService {

    private final FolioChargeRepository chargeRepo;
    private final FolioPaymentRepository paymentRepo;

    public FolioCharge addCharge(UUID reservationId, UUID roomReservationId, FolioChargeType type,
                                  String description, BigDecimal amount) {
        return addCharge(reservationId, roomReservationId, type, description, amount, null);
    }

    /** externalOrderId lets a caller (e.g. the POS/room-charge RabbitMQ consumer) make
     *  posting a charge idempotent against message redelivery — see existsByOrderId. */
    public FolioCharge addCharge(UUID reservationId, UUID roomReservationId, FolioChargeType type,
                                  String description, BigDecimal amount, String externalOrderId) {
        return chargeRepo.save(FolioCharge.builder()
            .reservationId(reservationId).roomReservationId(roomReservationId)
            .type(type).description(description).amount(amount).externalOrderId(externalOrderId).build());
    }

    public boolean existsByOrderId(String externalOrderId) {
        return externalOrderId != null && chargeRepo.existsByExternalOrderId(externalOrderId);
    }

    /** Room revenue already posted for a reservation — the base surcharges/discounts
     *  are computed against (see SurchargeService/DiscountService). */
    public BigDecimal roomRevenue(UUID reservationId) {
        return chargeRepo.findByReservationIdAndType(reservationId, FolioChargeType.ROOM).stream()
            .map(FolioCharge::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public FolioPayment addPayment(UUID reservationId, PaymentMethod method, BigDecimal amount,
                                    String reference, String createdBy) {
        return paymentRepo.save(FolioPayment.builder()
            .reservationId(reservationId).method(method).amount(amount)
            .reference(reference).createdBy(createdBy).build());
    }

    /** A group organizer settling the whole block in one payment — not attributable to
     *  any single member reservation, so it's recorded against the group itself. */
    public FolioPayment addGroupPayment(UUID groupId, PaymentMethod method, BigDecimal amount,
                                         String reference, String createdBy) {
        return paymentRepo.save(FolioPayment.builder()
            .groupId(groupId).method(method).amount(amount)
            .reference(reference).createdBy(createdBy).build());
    }

    public List<FolioPayment> groupPayments(UUID groupId) {
        return paymentRepo.findByGroupIdOrderByCreatedAtAsc(groupId);
    }

    public Map<String, Object> getFolio(UUID reservationId) {
        List<FolioCharge> charges = chargeRepo.findByReservationIdOrderByCreatedAtAsc(reservationId);
        List<FolioPayment> payments = paymentRepo.findByReservationIdOrderByCreatedAtAsc(reservationId);
        BigDecimal totalCharges = charges.stream().map(FolioCharge::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPayments = payments.stream().map(FolioPayment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return Map.of(
            "charges", charges,
            "payments", payments,
            "totalCharges", totalCharges,
            "totalPayments", totalPayments,
            "balance", totalCharges.subtract(totalPayments));
    }
}
