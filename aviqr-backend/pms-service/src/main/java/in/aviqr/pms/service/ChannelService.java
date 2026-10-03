package in.aviqr.pms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.dto.AcceptBookingRequest;
import in.aviqr.pms.dto.ChannelWebhookRequest;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelBookingRepository;
import in.aviqr.pms.repository.ChannelMappingRepository;
import in.aviqr.pms.repository.ChannelSyncLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor @Slf4j
public class ChannelService {

    private final ChannelMappingRepository mappingRepo;
    private final ChannelBookingRepository channelBookingRepo;
    private final ChannelSyncLogRepository syncLogRepo;
    private final ReservationService reservationService;
    private final AvailabilityService availabilityService;
    private final AxisRoomsAriService ariService;
    private final ObjectMapper objectMapper;

    /** Thrown when an AxisRooms booking push's accessKey/hotelId match no live
     *  mapping — the controller reports it without echoing anything back. */
    public static class ChannelAuthException extends RuntimeException {
        public ChannelAuthException(String message) { super(message); }
    }

    public ChannelMapping createMapping(ChannelMapping req) {
        if (req.getHotelId() == null || req.getRoomTypeId() == null || req.getChannel() == null
                || isBlank(req.getExternalPropertyId()) || isBlank(req.getExternalRoomTypeId()))
            throw new IllegalArgumentException("Channel, room type, external property ID and external room type ID are required");
        // Within one connection an external (room, rate plan) pair must point at exactly
        // one of our mappings — bookings are resolved through it.
        String plan = isBlank(req.getExternalRatePlanId()) ? null : req.getExternalRatePlanId().trim();
        mappingRepo.findByHotelId(req.getHotelId()).stream()
            .filter(m -> m.getChannel() == req.getChannel()
                && req.getExternalPropertyId().trim().equals(m.getExternalPropertyId())
                && req.getExternalRoomTypeId().trim().equals(m.getExternalRoomTypeId())
                && Objects.equals(plan, isBlank(m.getExternalRatePlanId()) ? null : m.getExternalRatePlanId()))
            .findFirst()
            .ifPresent(m -> { throw new IllegalArgumentException("This " + req.getChannel() + " room"
                + (plan == null ? "" : " / rate plan") + " is already mapped — edit or remove that mapping instead"); });
        req.setExternalPropertyId(req.getExternalPropertyId().trim());
        req.setExternalRoomTypeId(req.getExternalRoomTypeId().trim());
        req.setExternalRatePlanId(plan);
        if (isBlank(req.getAccessKey())) {
            mappingRepo.findByHotelId(req.getHotelId()).stream()
                .filter(m -> m.getChannel() == req.getChannel())
                .filter(m -> Objects.equals(m.getExternalPropertyId(), req.getExternalPropertyId()))
                .filter(m -> !isBlank(m.getAccessKey()))
                .findFirst().ifPresent(m -> req.setAccessKey(m.getAccessKey()));
        }
        validateConnection(req);
        normalizeConnection(req);
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
        ChannelMapping candidate = ChannelMapping.builder()
            .channel(existing.getChannel())
            .accessKey(isBlank(req.getAccessKey()) ? existing.getAccessKey() : req.getAccessKey())
            .channelId(req.getChannelId())
            .cmBaseUrl(req.getCmBaseUrl())
            .build();
        validateConnection(candidate);
        existing.setExternalPropertyId(req.getExternalPropertyId());
        existing.setExternalRoomTypeId(req.getExternalRoomTypeId());
        existing.setExternalRatePlanId(req.getExternalRatePlanId());
        existing.setInternalRatePlanId(req.getInternalRatePlanId());
        if (!isBlank(req.getAccessKey())) existing.setAccessKey(req.getAccessKey().trim());
        existing.setChannelId(req.getChannelId());
        existing.setCmBaseUrl(req.getCmBaseUrl());
        normalizeConnection(existing);
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
            .reservationId(reservation.getId())
            .hotelId(hotelId).ota(req.getChannel().name()).lastStatus("confirmed").updatedAt(LocalDateTime.now())
            .build());

        syncLogRepo.save(ChannelSyncLog.builder()
            .hotelId(hotelId).channel(req.getChannel()).direction(SyncDirection.PULL).status(SyncStatus.SUCCESS)
            .syncType(SyncType.BOOKING).triggerSource("CHANNEL")
            .message("Ingested booking " + req.getExternalBookingId() + " (" + req.getGuestName() + ", "
                + req.getCheckInDate() + " to " + req.getCheckOutDate() + ")")
            .build());

        return reservation;
    }

    /**
     * Booking push from the AxisRooms channel manager (see AcceptBookingRequest).
     * accessKey + BookingDetails.hotelId must match a live mapping before anything
     * else in the payload is trusted. The idempotency key is otaRefId:bookingNo, since
     * bookingNo is the OTA's own reference and two OTAs can reuse one:
     *   confirmed  → new reservation; a repeat returns the one already created
     *   modified   → the old reservation is superseded and the full new booking
     *                created in its place, atomically (a modification for a booking
     *                we never saw is taken as a new booking)
     *   cancelled  → cancels it; cancelling twice is a no-op
     */
    @Transactional
    public Reservation ingestBookingReal(AcceptBookingRequest req) {
        AcceptBookingRequest.BookingDetails bd = req.getBookingDetails();
        if (bd == null || isBlank(bd.getBookingNo()) || isBlank(bd.getHotelId()))
            throw new RuntimeException("BookingDetails.bookingNo and BookingDetails.hotelId are required");
        if (isBlank(req.getAccessKey()))
            throw new ChannelAuthException("accessKey is required");
        List<ChannelMapping> propertyMappings =
            mappingRepo.findByAccessKeyAndExternalPropertyIdAndActiveTrue(req.getAccessKey(), bd.getHotelId());
        if (propertyMappings.isEmpty())
            throw new ChannelAuthException("No active mapping for this accessKey and hotelId " + bd.getHotelId());

        UUID hotelId = propertyMappings.get(0).getHotelId();
        ChannelName channel = propertyMappings.get(0).getChannel();
        String bookingKey = isBlank(bd.getOtaRefId()) ? bd.getBookingNo() : bd.getOtaRefId().trim() + ":" + bd.getBookingNo();
        String status = isBlank(bd.getBookingStatus()) ? "confirmed" : bd.getBookingStatus().trim().toLowerCase();
        var existing = channelBookingRepo.findByChannelAndExternalBookingId(channel, bookingKey);

        if ("cancelled".equals(status) || "canceled".equals(status)) {
            if (existing.isEmpty()) throw new RuntimeException("Unknown booking " + bd.getBookingNo() + " — nothing to cancel");
            Reservation current = reservationService.get(existing.get().getReservationId());
            if (current.getStatus() == ReservationStatus.CANCELLED) return current;
            Reservation cancelled = reservationService.cancel(current.getId());
            touch(existing.get(), hotelId, bd, "cancelled");
            logPull(hotelId, channel, current.getId(), "Cancelled " + describe(bd));
            return cancelled;
        }

        if (existing.isPresent() && !"modified".equals(status)) {
            log.info("Duplicate AxisRooms booking push for {} — returning existing reservation", bookingKey);
            return reservationService.get(existing.get().getReservationId());
        }

        if (existing.isPresent()) reservationService.supersede(existing.get().getReservationId());
        Reservation reservation = createFromAxisRooms(req, hotelId, propertyMappings);

        if (existing.isPresent()) {
            ChannelBooking link = existing.get();
            link.setReservationId(reservation.getId());
            touch(link, hotelId, bd, "modified");
            logPull(hotelId, channel, reservation.getId(), "Modified " + describe(bd) + " (" + reservation.getCheckInDate() + " to " + reservation.getCheckOutDate() + ")");
        } else {
            channelBookingRepo.save(ChannelBooking.builder()
                .channel(channel).externalBookingId(bookingKey).reservationId(reservation.getId())
                .hotelId(hotelId).ota(bd.getOta()).lastStatus("confirmed").updatedAt(LocalDateTime.now())
                .build());
            logPull(hotelId, channel, reservation.getId(), "Accepted " + describe(bd) + " (" + reservation.getCheckInDate() + " to " + reservation.getCheckOutDate() + ")");
        }
        return reservation;
    }

    private Reservation createFromAxisRooms(AcceptBookingRequest req, UUID hotelId, List<ChannelMapping> propertyMappings) {
        AcceptBookingRequest.CheckinDetails cd = req.getCheckinDetails();
        if (cd == null || isBlank(cd.getCheckInDate()) || isBlank(cd.getCheckOutDate()))
            throw new RuntimeException("CheckinDetails.checkInDate and checkOutDate are required");
        if (req.getRates() == null || req.getRates().getRoomType() == null || req.getRates().getRoomType().isEmpty())
            throw new RuntimeException("At least one Rates.roomType line is required");

        LocalDate checkIn = LocalDate.parse(cd.getCheckInDate().trim());
        LocalDate checkOut = LocalDate.parse(cd.getCheckOutDate().trim());
        long nights = Math.max(1, ChronoUnit.DAYS.between(checkIn, checkOut));
        List<AcceptBookingRequest.RoomTypeLine> roomLines = req.getRates().getRoomType();
        int totalRooms = roomLines.stream().mapToInt(rt -> Math.max(1, parseIntOr(rt.getNoOfRooms(), 1))).sum();
        BigDecimal bookingTotal = parseAmountOr(cd.getTotalAmount(), BigDecimal.ZERO);

        List<ReservationService.ChannelRoomLine> lines = new ArrayList<>();
        for (AcceptBookingRequest.RoomTypeLine rt : roomLines) {
            ChannelMapping mapping = resolveMapping(propertyMappings, rt);
            int rooms = Math.max(1, parseIntOr(rt.getNoOfRooms(), 1));
            BigDecimal perRoomNight = lineTotal(rt, bookingTotal, rooms, totalRooms)
                .divide(BigDecimal.valueOf((long) rooms * nights), 2, RoundingMode.HALF_UP);
            for (int i = 0; i < rooms; i++) {
                lines.add(new ReservationService.ChannelRoomLine(mapping.getRoomTypeId(), mapping.getInternalRatePlanId(), perRoomNight));
            }
        }

        int children = Math.max(0, parseIntOr(cd.getChildren(), 0));
        int adults = parseIntOr(cd.getAdult(), parseIntOr(cd.getTotalPax(), 1) - children);
        AcceptBookingRequest.GuestDetails guest = req.getGuestDetails();
        return reservationService.createFromChannel(hotelId,
            guest != null ? guest.getGuestName() : null,
            guest != null ? guest.getMobileNo() : null,
            checkIn, checkOut, Math.max(1, adults), children, bookingNotes(req), lines);
    }

    /** Exact (room, rate plan) match first; otherwise any mapping for the room — an
     *  OTA rate plan we haven't mapped still books the right room type. */
    private ChannelMapping resolveMapping(List<ChannelMapping> propertyMappings, AcceptBookingRequest.RoomTypeLine rt) {
        List<ChannelMapping> forRoom = propertyMappings.stream()
            .filter(m -> Objects.equals(m.getExternalRoomTypeId(), rt.getId()))
            .toList();
        if (forRoom.isEmpty()) throw new RuntimeException("Room " + rt.getId() + " is not mapped in AviQR");
        return forRoom.stream()
            .filter(m -> !isBlank(rt.getRatePlanId()) && rt.getRatePlanId().equals(m.getExternalRatePlanId()))
            .findFirst()
            .orElse(forRoom.get(0));
    }

    /** Amount for all rooms on this line for the whole stay: the day-wise rates if
     *  AxisRooms sent them, else roomWisePrice, else this line's share of the booking
     *  total. Taken as covering the whole line (every room on it) — to be confirmed
     *  against a real multi-room push. */
    private BigDecimal lineTotal(AcceptBookingRequest.RoomTypeLine rt, BigDecimal bookingTotal, int rooms, int totalRooms) {
        if (rt.getDayWiseDetails() != null && !rt.getDayWiseDetails().isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            boolean any = false;
            for (AcceptBookingRequest.DayWiseDetail d : rt.getDayWiseDetails()) {
                BigDecimal rate = parseAmountOr(d.getRate(), null);
                if (rate != null) { sum = sum.add(rate); any = true; }
            }
            if (any) return sum;
        }
        BigDecimal roomWise = parseAmountOr(rt.getRoomWisePrice(), null);
        if (roomWise != null) return roomWise;
        return bookingTotal.multiply(BigDecimal.valueOf(rooms)).divide(BigDecimal.valueOf(totalRooms), 2, RoundingMode.HALF_UP);
    }

    private String bookingNotes(AcceptBookingRequest req) {
        AcceptBookingRequest.BookingDetails bd = req.getBookingDetails();
        AcceptBookingRequest.CheckinDetails cd = req.getCheckinDetails();
        StringBuilder sb = new StringBuilder("AxisRooms: ")
            .append(isBlank(bd.getOta()) ? "OTA" : bd.getOta())
            .append(" booking ").append(bd.getBookingNo());
        if (!isBlank(cd.getTotalAmount())) sb.append(" | total ").append(cd.getTotalAmount());
        if (!isBlank(cd.getCurrency())) sb.append(" ").append(cd.getCurrency());
        if (!isBlank(cd.getPaid())) sb.append(" | paid ").append(cd.getPaid());
        if (!isBlank(cd.getAmountToBeCollected())) sb.append(" | to collect ").append(cd.getAmountToBeCollected());
        if (cd.getSpecialRequest() != null && !cd.getSpecialRequest().isEmpty())
            sb.append(" | requests: ").append(String.join("; ", cd.getSpecialRequest()));
        if (req.getGuestDetails() != null && !isBlank(req.getGuestDetails().getEmailId()))
            sb.append(" | email ").append(req.getGuestDetails().getEmailId());
        return sb.toString();
    }

    private String describe(AcceptBookingRequest.BookingDetails bd) {
        return "booking " + bd.getBookingNo() + " via " + (isBlank(bd.getOta()) ? "AxisRooms" : bd.getOta());
    }

    private void touch(ChannelBooking link, UUID hotelId, AcceptBookingRequest.BookingDetails bd, String status) {
        if (link.getHotelId() == null) link.setHotelId(hotelId);
        if (!isBlank(bd.getOta())) link.setOta(bd.getOta());
        link.setLastStatus(status);
        link.setUpdatedAt(LocalDateTime.now());
        channelBookingRepo.save(link);
    }

    private void logPull(UUID hotelId, ChannelName channel, UUID reservationId, String message) {
        String roomTypeIds = reservationService.rooms(reservationId).stream()
            .map(rr -> rr.getRoomTypeId().toString()).distinct().collect(Collectors.joining(","));
        syncLogRepo.save(ChannelSyncLog.builder()
            .hotelId(hotelId).channel(channel).direction(SyncDirection.PULL).status(SyncStatus.SUCCESS)
            .syncType(SyncType.BOOKING).roomTypeIds(roomTypeIds).triggerSource("CHANNEL")
            .message(message).build());
    }

    private static boolean isBlank(String s) { return s == null || s.isBlank(); }

    private int parseIntOr(String s, int fallback) {
        try { return isBlank(s) ? fallback : Integer.parseInt(s.trim()); }
        catch (NumberFormatException e) { return fallback; }
    }

    private BigDecimal parseAmountOr(String s, BigDecimal fallback) {
        try { return isBlank(s) ? fallback : new BigDecimal(s.trim()); }
        catch (NumberFormatException e) { return fallback; }
    }

    /**
     * ARI push: mappings with a configured cmBaseUrl get the full inventory/price/
     * restriction push (AxisRoomsAriService). A mapping with no cmBaseUrl (e.g. the
     * demo mapping) falls back to a log-only simulation so the sync log/UI still has
     * something to show without a live connection.
     */
    public void pushAvailabilityAndRates(UUID hotelId) {
        pushAvailabilityAndRates(hotelId, "MANUAL");
    }

    public void pushAvailabilityAndRates(UUID hotelId, String trigger) {
        pushForMappings(mappingRepo.findByHotelIdAndActiveTrue(hotelId),
            AxisRoomsAriService.PushRequest.of(AxisRoomsAriService.ARI_TYPES, trigger));
    }

    /** What staff can ask the Channel Manager page to sync: any mix of inventory /
     *  rates / restrictions, narrowed to one connection, some room types, specific
     *  mappings, and/or a date range — every filter optional (null = everything). */
    public record SyncCommand(Set<SyncType> types, ChannelName channel, String externalPropertyId,
                              Set<UUID> roomTypeIds, Set<UUID> mappingIds, LocalDate from, LocalDate to) {}

    /** Runs a staff-requested sync now and returns the sync-log rows it produced, so
     *  the page can show the outcome of exactly this click. */
    public List<ChannelSyncLog> sync(UUID hotelId, SyncCommand cmd, String userId) {
        Set<SyncType> types = cmd.types() == null || cmd.types().isEmpty()
            ? AxisRoomsAriService.ARI_TYPES
            : cmd.types().stream().filter(AxisRoomsAriService.ARI_TYPES::contains).collect(Collectors.toCollection(() -> EnumSet.noneOf(SyncType.class)));
        if (types.isEmpty()) throw new IllegalArgumentException("Pick at least one of inventory, rates or restrictions");

        List<ChannelMapping> selected = mappingRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .filter(m -> cmd.channel() == null || cmd.channel() == m.getChannel())
            .filter(m -> isBlank(cmd.externalPropertyId()) || cmd.externalPropertyId().equals(m.getExternalPropertyId()))
            .filter(m -> cmd.roomTypeIds() == null || cmd.roomTypeIds().isEmpty() || cmd.roomTypeIds().contains(m.getRoomTypeId()))
            .filter(m -> cmd.mappingIds() == null || cmd.mappingIds().isEmpty() || cmd.mappingIds().contains(m.getId()))
            .toList();
        if (selected.isEmpty()) throw new IllegalArgumentException("No active mapping matches this selection");

        List<ChannelMapping> live = selected.stream().filter(ChannelService::hasConnectionDetails)
            .filter(m -> m.getChannel() == ChannelName.AXISROOMS && isLiveConnectionReady(m)).toList();
        List<ChannelSyncLog> out = new ArrayList<>();
        if (!live.isEmpty()) {
            out.addAll(ariService.push(live, new AxisRoomsAriService.PushRequest(types, cmd.from(), cmd.to(), "MANUAL", userId)));
        }
        selected.stream().filter(m -> !hasConnectionDetails(m)).forEach(m -> out.add(pushSimulated(m, "MANUAL")));
        selected.stream().filter(ChannelService::hasConnectionDetails).filter(m -> !live.contains(m))
            .forEach(m -> out.add(pushConfigurationFailure(m, "MANUAL")));
        return out;
    }

    /** Auto-sync-on-save: pushes just the mappings for one room type, so saving a rate
     *  or inventory change for a single room type doesn't re-push every other room
     *  type's ARI too. Used by RatePlanController/RoomTypeController when a day-price
     *  or inventory update opts into autoSync. */
    public void pushForRoomType(UUID roomTypeId) {
        pushForMappings(mappingRepo.findByRoomTypeIdAndActiveTrue(roomTypeId),
            AxisRoomsAriService.PushRequest.of(AxisRoomsAriService.ARI_TYPES, "AUTO"));
    }

    /** A booking/cancellation/stay change in AviQR changes sellable rooms, so live
     *  channel managers get fresh availability for those room types. After commit (the
     *  push must see the change) and off the request thread (it's outbound HTTP). */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onInventoryChanged(InventoryChangedEvent event) {
        try {
            List<ChannelMapping> mappings = event.roomTypeIds().stream()
                .flatMap(id -> mappingRepo.findByRoomTypeIdAndActiveTrue(id).stream())
                .toList();
            ariService.pushInventoryOnly(mappings);
        } catch (Exception e) {
            log.warn("Inventory push after reservation change failed for hotel {}: {}", event.hotelId(), e.getMessage());
        }
    }

    private void pushForMappings(List<ChannelMapping> mappings, AxisRoomsAriService.PushRequest req) {
        List<ChannelMapping> live = mappings.stream().filter(ChannelService::hasConnectionDetails)
            .filter(m -> m.getChannel() == ChannelName.AXISROOMS && isLiveConnectionReady(m)).toList();
        if (!live.isEmpty()) ariService.push(live, req);
        mappings.stream().filter(m -> !hasConnectionDetails(m)).forEach(m -> pushSimulated(m, req.trigger()));
        mappings.stream().filter(ChannelService::hasConnectionDetails).filter(m -> !live.contains(m))
            .forEach(m -> pushConfigurationFailure(m, req.trigger()));
    }

    private static boolean hasConnectionDetails(ChannelMapping mapping) {
        return !isBlank(mapping.getCmBaseUrl()) || !isBlank(mapping.getAccessKey()) || !isBlank(mapping.getChannelId());
    }

    private static boolean isLiveConnectionReady(ChannelMapping mapping) {
        if (isBlank(mapping.getCmBaseUrl()) || isBlank(mapping.getAccessKey()) || isBlank(mapping.getChannelId())) return false;
        try {
            validateConnection(mapping);
            return true;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    private static void normalizeConnection(ChannelMapping mapping) {
        if (mapping.getAccessKey() != null) mapping.setAccessKey(mapping.getAccessKey().trim());
        if (mapping.getChannelId() != null) mapping.setChannelId(mapping.getChannelId().trim());
        if (mapping.getCmBaseUrl() != null) mapping.setCmBaseUrl(mapping.getCmBaseUrl().trim());
    }

    /** Only the AxisRooms adapter currently speaks this outbound ARI contract. Do
     *  not send its payloads to a different vendor just because a URL was entered. */
    private ChannelSyncLog pushConfigurationFailure(ChannelMapping mapping, String trigger) {
        String message = mapping.getChannel() != ChannelName.AXISROOMS
            ? "Live sync is not available for " + mapping.getChannel() + " yet; no outbound request was sent."
            : "AxisRooms connection is incomplete; provide the access key, PMS channel ID and API base URL. No request was sent.";
        return syncLogRepo.save(ChannelSyncLog.builder()
            .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH)
            .status(SyncStatus.FAILED).syncType(SyncType.INVENTORY)
            .externalPropertyId(mapping.getExternalPropertyId()).roomTypeIds(mapping.getRoomTypeId().toString())
            .triggerSource(trigger).message(message).responseBody(message).build());
    }

    private static void validateConnection(ChannelMapping mapping) {
        boolean any = hasConnectionDetails(mapping);
        if (!any) return; // No connection means an intentional local simulation.
        if (mapping.getChannel() != ChannelName.AXISROOMS)
            throw new IllegalArgumentException("Live outbound sync is currently supported only for AxisRooms");
        if (isBlank(mapping.getAccessKey()) || isBlank(mapping.getChannelId()) || isBlank(mapping.getCmBaseUrl()))
            throw new IllegalArgumentException("AxisRooms live sync requires an access key, PMS channel ID and API base URL");
        try {
            URI uri = new URI(mapping.getCmBaseUrl().trim());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null
                    || !isAxisRoomsTransactionalHost(host)
                    || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)
                    || (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath()))
                    || uri.getQuery() != null || uri.getFragment() != null)
                throw new IllegalArgumentException("AxisRooms API base URL must be an HTTPS AxisRooms host without a path or query");
        } catch (URISyntaxException e) {
            throw new IllegalArgumentException("AxisRooms API base URL is invalid", e);
        }
    }

    private static boolean isAxisRoomsTransactionalHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return "api.axisrooms.com".equals(normalized)
            || normalized.matches("sandbox[1-9][0-9]?\\.axisrooms\\.com");
    }

    private ChannelSyncLog pushSimulated(ChannelMapping mapping, String trigger) {
        try {
            LocalDate today = LocalDate.now();
            int available = availabilityService.availableCount(mapping.getHotelId(), mapping.getRoomTypeId(), today, today.plusDays(1));
            // No cmBaseUrl on this mapping — this is the shape a real push would have
            // POSTed to /api/inventory, kept here so "what would we have sent" is
            // still inspectable without a live connection.
            Map<String, Object> wouldSend = Map.of(
                "accessKey", isBlank(mapping.getAccessKey()) ? "" : "[REDACTED]",
                "channelId", mapping.getChannelId() == null ? "" : mapping.getChannelId(),
                "hotels", List.of(Map.of(
                    "hotelId", mapping.getExternalPropertyId(),
                    "rooms", List.of(Map.of(
                        "roomId", mapping.getExternalRoomTypeId(),
                        "startDate", today.toString(),
                        "endDate", today.toString(),
                        "availability", available)))));
            return syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.SUCCESS)
                .syncType(SyncType.INVENTORY).externalPropertyId(mapping.getExternalPropertyId())
                .roomTypeIds(mapping.getRoomTypeId().toString()).dateFrom(today).dateTo(today).triggerSource(trigger)
                .message("[simulated — no cmBaseUrl configured] availability for " + mapping.getExternalRoomTypeId() + " on " + today + " = " + available)
                .requestBody(toJson(wouldSend))
                .responseBody("No live connection configured for this mapping (cmBaseUrl is blank) — no HTTP call was made; this is a local simulation only.")
                .build());
        } catch (Exception e) {
            return syncLogRepo.save(ChannelSyncLog.builder()
                .hotelId(mapping.getHotelId()).channel(mapping.getChannel()).direction(SyncDirection.PUSH).status(SyncStatus.FAILED)
                .syncType(SyncType.INVENTORY).externalPropertyId(mapping.getExternalPropertyId())
                .roomTypeIds(mapping.getRoomTypeId().toString()).triggerSource(trigger)
                .message("Simulated push failed for " + mapping.getExternalRoomTypeId() + ": " + e.getMessage())
                .responseBody("error: " + e.getMessage())
                .build());
        }
    }

    private String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (Exception e) { return String.valueOf(o); }
    }
}
