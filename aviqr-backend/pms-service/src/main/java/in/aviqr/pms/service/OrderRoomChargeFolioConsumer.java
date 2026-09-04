package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.config.RabbitMQConfig;
import in.aviqr.pms.entity.FolioChargeType;
import in.aviqr.pms.entity.RoomReservation;
import in.aviqr.pms.repository.RoomReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Reuses order-qr-service's existing "charge to room" flow for the in-house POS milestone
 * instead of building a parallel POS domain (menu items, KOT, tables already live in
 * order-qr-service/menu-ocr-service) — see hotel-service's OrderRoomChargeConsumer for the
 * sibling consumer that keeps its own lightweight per-room ledger regardless of whether a
 * PMS reservation exists. This one additionally posts the charge onto the guest's actual
 * folio when the room has a reservation currently checked in, so it settles at checkout
 * alongside room charges and payments.
 */
@Service @RequiredArgsConstructor @Slf4j
public class OrderRoomChargeFolioConsumer {

    private final HotelServiceClient hotelServiceClient;
    private final RoomReservationRepository roomReservationRepo;
    private final FolioService folioService;

    @RabbitListener(queues = RabbitMQConfig.ORDER_NEW_QUEUE)
    public void onNewOrder(Map<String, Object> event) {
        if (!"ROOM_CHARGE".equals(event.get("paymentMethod"))) return;
        String hotelIdStr = str(event, "hotelId");
        String roomNumber = str(event, "roomNumber");
        String orderId = str(event, "orderId");
        if (hotelIdStr == null || roomNumber == null || orderId == null) {
            log.warn("ROOM_CHARGE order {} missing hotelId/roomNumber — skipping folio posting", event.get("orderId"));
            return;
        }
        if (folioService.existsByOrderId(orderId)) {
            log.info("Order {} already posted to a folio — skipping duplicate delivery", orderId);
            return;
        }

        UUID hotelId = UUID.fromString(hotelIdStr);
        UUID roomId = hotelServiceClient.findRoomId(hotelId, roomNumber).orElse(null);
        if (roomId == null) {
            log.warn("No hotel-service room {} found for hotel {} — skipping folio posting", roomNumber, hotelId);
            return;
        }

        RoomReservation activeStay = roomReservationRepo.findActiveStayByRoomId(roomId).orElse(null);
        if (activeStay == null) {
            // No PMS reservation covers this room right now — hotel-service's own
            // RoomCharge ledger (already updated by its own consumer) remains the
            // only record, exactly as before this milestone.
            log.info("Room {} (hotel {}) has no active PMS stay — order {} not attributed to a folio", roomNumber, hotelId, orderId);
            return;
        }

        String orderNumber = str(event, "orderNumber");
        BigDecimal amount = new BigDecimal(str(event, "total"));
        folioService.addCharge(activeStay.getReservationId(), activeStay.getId(), FolioChargeType.POS,
            "Order #" + orderNumber, amount, orderId);
    }

    private String str(Map<String, Object> m, String key) {
        Object v = m.get(key);
        return v != null ? v.toString() : null;
    }
}
