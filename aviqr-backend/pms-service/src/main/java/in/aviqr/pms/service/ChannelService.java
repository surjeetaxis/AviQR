package in.aviqr.pms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.dto.AcceptBookingRequest;
import in.aviqr.pms.dto.ChannelWebhookRequest;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelBookingRepository;
import in.aviqr.pms.repository.ChannelMappingRepository;
import in.aviqr.pms.repository.ChannelSyncLogRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j
public class ChannelService {

    private static final DateTimeFormatter CM_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ChannelMappingRepository mappingRepo;
    private final ChannelBookingRepository channelBookingRepo;
    private final ChannelSyncLogRepository syncLogRepo;
    private final ReservationService reservationService;
    private final AvailabilityService availabilityService;
    private final RatePlanService ratePlanService;
    private final RatePlanRepository ratePlanRepo;
    private final ObjectMapper objectMapper;
    @Qualifier("externalRestTemplate") private final RestTemplate externalRestTemplate;

    public ChannelMapping createMapping(ChannelMapping req) {
        req.setId(null);
        req.setWebhookSecret(UUID.randomUUID().toString().replace("-", ""));
        req.setActive(true);
        return mappingRepo.save(req);
    }

    public List<ChannelMapping> listForHotel(UUID hotelId) {
        return mappingRepo.findByHotelId(hotelId);
    }

    public ChannelMapping updateMapping(UUID id, ChannelMapping req) {
        ChannelMapping existing = mappingRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Channel mapping not found: " + id));
        existing.setExternalPropertyId(req.getExternalPropertyId());
        existing.setExternalRoomTypeId(req.getExternalRoomTypeId());
        existing.setExternalRatePlanId(req.getExternalRatePlanId());
        existing.setAccessKey(req.getAccessKey());
        existing.setChannelId(req.getChannelId());
        existing.setCmBaseUrl(req.getCmBaseUrl());
        if (req.getActive() != null) existing.setActive(req.getActive());
        return mappingRepo.save(existing);
    }

    public List<ChannelSyncLog> syncLog(UUID hotelId) {
        return syncLogRepo.findTop50ByHotelIdOrderByCreatedAtDesc(hotelId);
    }

    /** Validates the webhook's shared secret against the mapping for its first room
     *  line — a channel manager configures one secret per property/room-type mapping,
     *  and a genuine notification's lines all belong to the same property. */
    public boolean isValidWebhookSecret(ChannelWebhookRequest req, String providedSecret) {
        if (providedSecret == null || req.getRooms() == null || req.getRooms().isEmpty()) return false;
        String firstRoomTypeId = req.getRooms().get(0).getExternalRoomTypeId();
        return mappingRepo.findByChannelAndExternalPropertyIdAndExternalRoomTypeId(
                req.getChannel(), req.getExternalPropertyId(), firstRoomTypeId)
            .map(m -> providedSecret.equals(m.getWebhookSecret()))
            .orElse(false);
    }

    /** Resolves each room line's (channel, externalPropertyId, externalRoomTypeId) to one
     *  of our RoomTypes, then books through the same availability/room-assignment path a
     *  direct booking uses. Idempotent on (channel, externalBookingId) — a channel manager
     *  retrying the same notification returns the reservation created the first time. */
    @Transactional
    public Reservation ingestBooking(ChannelWebhookRequest req) {
        var existing = channelBookingRepo.findByChannelAndExternalBookingId(req.getChannel(), req.getExternalBookingId());
        if (existing.isPresent()) {
            log.info("Duplicate webhook for {} booking {} — returning existing reservation", req.getChannel(), req.getExternalBookingId());
            return reservationService.get(existing.get().getReservationId());
        }
        if (req.getRooms() == null || req.getRooms().isEmpty())
            throw new RuntimeException("At least one room line is required");

        UUID hotelId = null;
        List<ReservationService.ChannelRoomLine> lines = new ArrayList<>();
        for (ChannelWebhookRequest.RoomLine rl : req.getRooms()) {
            ChannelMapping mapping = mappingRepo
                .findByChannelAndExternalPropertyIdAndExternalRoomTypeId(req.getChannel(), req.getExternalPropertyId(), rl.getExternalRoomTypeId())
                .filter(ChannelMapping::getActive)
                .orElseThrow(() -> new RuntimeException("No active mapping for " + req.getChannel() + "/" + req.getExternalPropertyId() + "/" + rl.getExternalRoomTypeId()));
            hotelId = mapping.getHotelId();
            BigDecimal rate = rl.getRatePerNight() != null ? rl.getRatePerNight() : BigDecimal.ZERO;
            lines.add(new ReservationService.ChannelRoomLine(mapping.getRoomTypeId(), rate));
        }

        Reservation reservation = reservationService.createFromChannel(hotelId, req.getGuestName(), req.getGuestPhone(),
            req.getCheckInDate(), req.getCheckOutDate(), req.getAdults() != null ? req.getAdults() : 1,
            req.getChildren() != null ? req.getChildren() : 0, req.getNotes(), lines);

        channelBookingRepo.save(ChannelBooking.builder()
            .channel(req.getChannel()).externalBookingId(req.getExternalBookingId())
            .reservationId(reservation.getId()).build());

        syncLogRepo.save(ChannelSyncLog.builder()
            .hotelId(hotelId).channel(req.getChannel()).direction(SyncDirection.PULL).status(SyncStatus.SUCCESS)
            .message("Ingested booking " + req.getExternalBookingId() + " (" + req.getGuestName() + ", "
                + req.getCheckInDate() + " to " + req.getCheckOutDate() + ")")
            .build());

        return reservation;
    }

    /**
     * Real-world accept-booking contract: nested Guest/Checkin/Booking/Rates blocks,
     * accessKey-authenticated, dates as dd/MM/yyyy strings, no explicit channel name —
     * accessKey + BookingDetails.hotelID + a Rates.roomType[].id line together identify
     * the mapping. bookingNo is the idempotency/modification key: a later notification
     * for the same bookingNo with bookingStatus=cancelled cancels the reservation instead
     * of creating a new one. Per-room-per-night pricing isn't in this payload, so the
     * booking's total amount is spread evenly across every assigned room-night — a
     * documented simplification, not a real per-room rate.
     */
    @Transactional
    public Reservation ingestBookingReal(AcceptBookingRequest req) {
        String bookingNo = req.getBookingDetails().getBookingNo();
        String hotelID = req.getBookingDetails().getHotelID();
        boolean cancelled = "cancelled".equalsIgnoreCase(req.getBookingDetails().getBookingStatus());

        var existing = channelBookingRepo.findByChannelAndExternalBookingId(ChannelName.GENERIC, bookingNo);
        if (existing.isPresent()) {
            if (cancelled) {
                Reservation cancelledRes = reservationService.cancel(existing.get().getReservationId());
                syncLogRepo.save(ChannelSyncLog.builder().hotelId(cancelledRes.getHotelId()).channel(ChannelName.GENERIC)
                    .direction(SyncDirection.PULL).status(SyncStatus.SUCCESS)
                    .message("Cancelled booking " + bookingNo).build());
                return cancelledRes;
            }
            log.info("Duplicate accept-booking notification for {} — returning existing reservation", bookingNo);
            return reservationService.get(existing.get().getReservationId());
        }
        if (cancelled) {
            log.warn("Cancellation for unknown booking {} — nothing to cancel", bookingNo);
            throw new RuntimeException("Unknown booking: " + bookingNo);
        }
        if (req.getRates() == null || req.getRates().getRoomType() == null || req.getRates().getRoomType().isEmpty())
            throw new RuntimeException("At least one Rates.roomType line is required");

        LocalDate checkIn = LocalDate.parse(req.getCheckinDetails().getCheckInDateTime(), CM_DATE);
        LocalDate checkOut = LocalDate.parse(req.getCheckinDetails().getCheckOutDateTime(), CM_DATE);
        long nights = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut));

        int totalRooms = req.getRates().getRoomType().stream()
            .mapToInt(rt -> parseIntOr(rt.getNoOfRooms(), 1)).sum();
        BigDecimal totalAmount = parseAmountOr(req.getCheckinDetails().getTotalAmount(), BigDecimal.ZERO);
        BigDecimal perRoomPerNight = totalRooms > 0
            ? totalAmount.divide(BigDecimal.valueOf(totalRooms), 2, RoundingMode.HALF_UP).divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        UUID hotelId = null;
        List<ReservationService.ChannelRoomLine> lines = new ArrayList<>();
        for (AcceptBookingRequest.RoomTypeLine rt : req.getRates().getRoomType()) {
            ChannelMapping mapping = mappingRepo
                .findByAccessKeyAndExternalPropertyIdAndExternalRoomTypeId(req.getAccessKey(), hotelID, rt.getId())
                .filter(ChannelMapping::getActive)
                .orElseThrow(() -> new RuntimeException("No active mapping for accessKey/" + hotelID + "/" + rt.getId()));
            hotelId = mapping.getHotelId();
            int roomCount = parseIntOr(rt.getNoOfRooms(), 1);
            for (int i = 0; i < roomCount; i++) {
                lines.add(new ReservationService.ChannelRoomLine(mapping.getRoomTypeId(), perRoomPerNight));
            }
        }

        Reservation reservation = reservationService.createFromChannel(hotelId,
            req.getGuestDetails() != null ? req.getGuestDetails().getGuestName() : null,
            req.getGuestDetails() != null ? req.getGuestDetails().getMobileNo() : null,
            checkIn, checkOut,
            parseIntOr(req.getCheckinDetails().getTotalPax(), 1),
            parseIntOr(req.getCheckinDetails().getChildren(), 0),
            "OTA: " + req.getBookingDetails().getOta() + " (booking " + bookingNo + ")",
            lines);

        channelBookingRepo.save(ChannelBooking.builder()
            .channel(ChannelName.GENERIC).externalBookingId(bookingNo).reservationId(reservation.getId()).build());

        syncLogRepo.save(ChannelSyncLog.builder()
            .hotelId(hotelId).channel(ChannelName.GENERIC).direction(SyncDirection.PULL).status(SyncStatus.SUCCESS)
            .message("Accepted booking " + bookingNo + " via " + req.getBookingDetails().getOta()
                + " (" + checkIn + " to " + checkOut + ", " + totalRooms + " room(s))")
            .build());

        return reservation;
    }

    private int parseIntOr(String s, int fallback) {
        try { return s == null || s.isBlank() ? fallback : Integer.parseInt(s.trim()); }
        catch (NumberFormatException e) { return fallback; }
    }

    private BigDecimal parseAmountOr(String s, BigDecimal fallback) {
        try { return s == null || s.isBlank() ? fallback : new BigDecimal(s.trim()); }
        catch (NumberFormatException e) { return fallback; }
    }

    /**
     * ARI push: for each active mapping with a configured cmBaseUrl/accessKey/channelId,
     * POSTs real inventory (availability, doubling as a stop-sell when 0) and
     * bulkPriceUpdate calls in the channel manager's own request shape. A mapping with no
     * cmBaseUrl configured (e.g. the demo mapping) falls back to a log-only simulation so
     * the sync log/UI still has something to show without a live connection.
     */
    public void pushAvailabilityAndRates(UUID hotelId) {
        pushForMappings(mappingRepo.findByHotelIdAndActiveTrue(hotelId));
    }

    /** Auto-sync-on-save: pushes just the mappings for one room type, so saving a rate
     *  or inventory change for a single room type doesn't re-push every other room
     *  type's ARI too. Used by RatePlanController/RoomTypeController when a day-price
     *  or inventory update opts into autoSync. */
    public void pushForRoomType(UUID roomTypeId) {
        pushForMappings(mappingRepo.findByRoomTypeIdAndActiveTrue(roomTypeId));
    }

    private void pushForMappings(List<ChannelMapping> mappings) {
        for (ChannelMapping mapping : mappings) {
            if (mapping.getCmBaseUrl() != null && !mapping.getCmBaseUrl().isBlank()) {
                pushInventoryReal(mapping);
                pushPriceReal(mapping);
            } else {
                pushSimulated(mapping);
            }
        }
    }

    private void pushInventoryReal(ChannelMapping mapping) {
        Map<String, Object> body = null;
        try {
            LocalDate today = LocalDate.now();
            LocalDate tomorrow = today.plusDays(1);
            int available = availabilityService.availableCount(mapping.getHotelId(), mapping.getRoomTypeId(), today, tomorrow);

            body = Map.of(
                "accessKey", mapping.getAccessKey(),
                "channelId", mapping.getChannelId(),
                "hotels", List.of(Map.of(
                    "hotelId", mapping.getExternalPropertyId(),
                    "rooms", List.of(Map.of(
                        "roomId", mapping.getExternalRoomTypeId(),
                        "startDate", today.toString(),
                        "endDate", tomorrow.toString(),
                        "availability", available)))));

            ResponseEntity<String> resp = post(mapping.getCmBaseUrl() + "/api/inventory", body);
            syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.SUCCESS)
                .message("Pushed inventory for " + mapping.getExternalRoomTypeId() + " (" + today + "): availability=" + available)
                .requestBody(toJson(body)).responseBody(describeResponse(resp))
                .build());
        } catch (Exception e) {
            syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.FAILED)
                .message("Inventory push failed for " + mapping.getExternalRoomTypeId() + ": " + e.getMessage())
                .requestBody(body != null ? toJson(body) : null).responseBody("error: " + e.getMessage())
                .build());
        }
    }

    private void pushPriceReal(ChannelMapping mapping) {
        if (mapping.getExternalRatePlanId() == null) return;
        Map<String, Object> body = null;
        try {
            LocalDate today = LocalDate.now();
            LocalDate horizon = today.plusDays(30);
            // No per-occupancy pricing model on our side yet — the same nightly rate is
            // sent for every occupancy tier the channel manager's price object expects.
            BigDecimal rate = ratePlanService.rateForNight(findInternalRatePlanId(mapping), today);
            Map<String, Object> priceTiers = Map.of(
                "Single", rate, "Double", rate, "Triple", rate, "Quad", rate);

            body = Map.of(
                "accessKey", mapping.getAccessKey(),
                "channelId", mapping.getChannelId(),
                "hotels", List.of(Map.of(
                    "hotelId", mapping.getExternalPropertyId(),
                    "rooms", List.of(Map.of(
                        "roomId", mapping.getExternalRoomTypeId(),
                        "rateplans", List.of(Map.of(
                            "rateplanId", mapping.getExternalRatePlanId(),
                            "otaIds", List.of(),
                            "priceDetails", List.of(Map.of(
                                "startDate", today.toString(),
                                "endDate", horizon.toString(),
                                "price", priceTiers)))))))));

            ResponseEntity<String> resp = post(mapping.getCmBaseUrl() + "/api/bulkPriceUpdate", body);
            syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.SUCCESS)
                .message("Pushed price for rate plan " + mapping.getExternalRatePlanId() + " (" + today + " to " + horizon + ")")
                .requestBody(toJson(body)).responseBody(describeResponse(resp))
                .build());
        } catch (Exception e) {
            syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.FAILED)
                .message("Price push failed for rate plan " + mapping.getExternalRatePlanId() + ": " + e.getMessage())
                .requestBody(body != null ? toJson(body) : null).responseBody("error: " + e.getMessage())
                .build());
        }
    }

    // mapping.externalRatePlanId is the channel manager's own rate-plan id, not one of
    // ours — the mapping only links a RoomType, so the first active internal RatePlan
    // for that room type is used as the source of truth for the price push. A hotel
    // with several rate plans per room type would need the mapping to name one
    // explicitly; that's a reasonable follow-up, not needed for a single-rate-plan hotel.
    private UUID findInternalRatePlanId(ChannelMapping mapping) {
        return ratePlanRepo.findByRoomTypeIdAndActiveTrue(mapping.getRoomTypeId()).stream()
            .findFirst()
            .map(RatePlan::getId)
            .orElseThrow(() -> new RuntimeException("No active rate plan for room type " + mapping.getRoomTypeId()));
    }

    private void pushSimulated(ChannelMapping mapping) {
        try {
            LocalDate today = LocalDate.now();
            int available = availabilityService.availableCount(mapping.getHotelId(), mapping.getRoomTypeId(), today, today.plusDays(1));
            // No cmBaseUrl on this mapping — this is the exact payload a real push would
            // have POSTed to /api/inventory, kept here so "what would we have sent" is
            // still inspectable without a live connection.
            Map<String, Object> wouldSend = Map.of(
                "accessKey", mapping.getAccessKey() == null ? "" : mapping.getAccessKey(),
                "channelId", mapping.getChannelId() == null ? "" : mapping.getChannelId(),
                "hotels", List.of(Map.of(
                    "hotelId", mapping.getExternalPropertyId(),
                    "rooms", List.of(Map.of(
                        "roomId", mapping.getExternalRoomTypeId(),
                        "startDate", today.toString(),
                        "availability", available)))));
            syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.SUCCESS)
                .message("[simulated — no cmBaseUrl configured] availability for " + mapping.getExternalRoomTypeId() + " on " + today + " = " + available)
                .requestBody(toJson(wouldSend))
                .responseBody("No live connection configured for this mapping (cmBaseUrl is blank) — no HTTP call was made; this is a local simulation only.")
                .build());
        } catch (Exception e) {
            syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.FAILED)
                .message("Simulated push failed for " + mapping.getExternalRoomTypeId() + ": " + e.getMessage())
                .responseBody("error: " + e.getMessage())
                .build());
        }
    }

    private String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (Exception e) { return String.valueOf(o); }
    }

    private String describeResponse(ResponseEntity<String> resp) {
        return "HTTP " + resp.getStatusCode().value() + (resp.getBody() != null ? "\n" + resp.getBody() : "");
    }

    private ResponseEntity<String> post(String url, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return externalRestTemplate.postForEntity(url, new HttpEntity<>(body, headers), String.class);
    }
}
