package in.aviqr.pms.service;

import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Read models behind the Channel Manager page: connections with their room/rate-plan
 * mappings and last sync per type, a channel calendar (what each mapped room type and
 * rate plan sends, bookings per night, and which dates changed since their last sync),
 * filterable sync logs, and the channel bookings list. Syncing itself lives in
 * ChannelService/AxisRoomsAriService.
 */
@Service @RequiredArgsConstructor
public class ChannelManagerService {

    // Channels that are a channel manager fronting many OTAs, vs a direct link to one
    // OTA — the page lists them on separate tabs.
    public static final Set<ChannelName> CHANNEL_MANAGERS = EnumSet.of(ChannelName.AXISROOMS, ChannelName.GENERIC);
    private static final Set<String> RATE_FIELDS = Set.of("price");
    private static final Set<String> RESTRICTION_FIELDS = Set.of("minStay", "maxStay", "closedToArrival", "closedToDeparture", "stopSell");
    private static final Set<String> INVENTORY_FIELDS = Set.of("allotment");
    private static final int MAX_CALENDAR_DAYS = 62;

    private final ChannelMappingRepository mappingRepo;
    private final ChannelSyncLogRepository syncLogRepo;
    private final ChannelBookingRepository channelBookingRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;
    private final DayPriceRepository dayPriceRepo;
    private final RoomTypeInventoryRepository inventoryRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final ReservationRepository reservationRepo;
    private final RateChangeLogRepository rateChangeLogRepo;
    private final AvailabilityService availabilityService;

    // ── Overview ─────────────────────────────────────────────────────────────────

    public record LastSync(SyncStatus status, LocalDateTime at, String message, String trigger) {}
    public record RatePlanLink(UUID mappingId, UUID internalRatePlanId, String internalRatePlanName,
                               String externalRatePlanId, boolean active) {}
    public record RoomTypeLink(UUID roomTypeId, String roomTypeName, String externalRoomTypeId,
                               List<RatePlanLink> ratePlans, Map<SyncType, LastSync> lastSync) {}
    public record ConnectionView(ChannelName channel, String kind, String externalPropertyId, String cmBaseUrl,
                                 String channelId, String accessKeyHint, boolean live, int mappingCount, int activeCount,
                                 Map<SyncType, LastSync> lastSync, long bookingsLast30Days, List<RoomTypeLink> roomTypes) {}
    public record UnmappedRoomType(UUID roomTypeId, String roomTypeName) {}
    public record Overview(List<ConnectionView> connections, List<UnmappedRoomType> unmappedRoomTypes,
                           Map<SyncStatus, Long> syncCountsLast24h) {}

    public Overview overview(UUID hotelId) {
        List<ChannelMapping> mappings = mappingRepo.findByHotelId(hotelId);
        Map<UUID, RoomType> roomTypes = roomTypeRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .collect(Collectors.toMap(RoomType::getId, rt -> rt, (a, b) -> a, LinkedHashMap::new));
        Map<UUID, RatePlan> ratePlans = new HashMap<>();
        roomTypes.keySet().forEach(id -> ratePlanRepo.findByRoomTypeIdAndActiveTrue(id).forEach(rp -> ratePlans.put(rp.getId(), rp)));
        List<ChannelSyncLog> recent = syncLogRepo.findTop500ByHotelIdAndDirectionOrderByCreatedAtDesc(hotelId, SyncDirection.PUSH);
        List<ChannelBooking> bookings = channelBookingRepo.findByHotelIdOrderByCreatedAtDesc(hotelId, PageRequest.of(0, 1000)).getContent();
        LocalDateTime monthAgo = LocalDateTime.now().minusDays(30);

        record Key(ChannelName channel, String propertyId, String baseUrl) {}
        Map<Key, List<ChannelMapping>> byConnection = mappings.stream().collect(Collectors.groupingBy(
            m -> new Key(m.getChannel(), m.getExternalPropertyId(), blankToNull(m.getCmBaseUrl())), LinkedHashMap::new, Collectors.toList()));

        List<ConnectionView> connections = new ArrayList<>();
        byConnection.forEach((key, ms) -> {
            ChannelMapping first = ms.get(0);
            Predicate<ChannelSyncLog> sameConnection = l -> l.getChannel() == key.channel()
                && (l.getExternalPropertyId() == null || l.getExternalPropertyId().equals(key.propertyId()));

            Map<String, List<ChannelMapping>> byRoom = ms.stream().collect(Collectors.groupingBy(
                m -> m.getRoomTypeId() + "|" + m.getExternalRoomTypeId(), LinkedHashMap::new, Collectors.toList()));
            List<RoomTypeLink> rooms = byRoom.values().stream().map(rms -> {
                ChannelMapping r = rms.get(0);
                List<RatePlanLink> plans = rms.stream().map(m -> {
                    RatePlan internal = m.getInternalRatePlanId() != null ? ratePlans.get(m.getInternalRatePlanId()) : null;
                    String name = internal != null ? internal.getName()
                        : m.getInternalRatePlanId() == null ? "First active rate plan" : "(inactive rate plan)";
                    return new RatePlanLink(m.getId(), m.getInternalRatePlanId(), name, m.getExternalRatePlanId(), Boolean.TRUE.equals(m.getActive()));
                }).toList();
                RoomType rt = roomTypes.get(r.getRoomTypeId());
                String rtId = r.getRoomTypeId().toString();
                return new RoomTypeLink(r.getRoomTypeId(), rt != null ? rt.getName() : "(inactive room type)", r.getExternalRoomTypeId(),
                    plans, lastSyncByType(recent, sameConnection.and(l -> l.getRoomTypeIds() != null && l.getRoomTypeIds().contains(rtId))));
            }).toList();

            long recentBookings = bookings.stream()
                .filter(b -> b.getChannel() == key.channel() && b.getCreatedAt() != null && b.getCreatedAt().isAfter(monthAgo))
                .count();
            connections.add(new ConnectionView(key.channel(), CHANNEL_MANAGERS.contains(key.channel()) ? "CHANNEL_MANAGER" : "OTA",
                key.propertyId(), key.baseUrl(), first.getChannelId(), hint(first.getAccessKey()), key.baseUrl() != null,
                ms.size(), (int) ms.stream().filter(m -> Boolean.TRUE.equals(m.getActive())).count(),
                lastSyncByType(recent, sameConnection), recentBookings, rooms));
        });

        Set<UUID> mappedActive = mappings.stream().filter(m -> Boolean.TRUE.equals(m.getActive()))
            .map(ChannelMapping::getRoomTypeId).collect(Collectors.toSet());
        List<UnmappedRoomType> unmapped = roomTypes.values().stream().filter(rt -> !mappedActive.contains(rt.getId()))
            .map(rt -> new UnmappedRoomType(rt.getId(), rt.getName())).toList();

        LocalDateTime dayAgo = LocalDateTime.now().minusHours(24);
        Map<SyncStatus, Long> counts = new EnumMap<>(SyncStatus.class);
        for (SyncStatus s : SyncStatus.values()) counts.put(s, 0L);
        recent.stream().filter(l -> l.getCreatedAt() != null && l.getCreatedAt().isAfter(dayAgo))
            .forEach(l -> counts.merge(l.getStatus(), 1L, Long::sum));
        return new Overview(connections, unmapped, counts);
    }

    /** Newest log per sync type among logs matching the filter (logs are newest-first). */
    private static Map<SyncType, LastSync> lastSyncByType(List<ChannelSyncLog> newestFirst, Predicate<ChannelSyncLog> filter) {
        Map<SyncType, LastSync> out = new EnumMap<>(SyncType.class);
        for (ChannelSyncLog l : newestFirst) {
            if (l.getSyncType() == null || out.containsKey(l.getSyncType()) || !filter.test(l)) continue;
            out.put(l.getSyncType(), new LastSync(l.getStatus(), l.getCreatedAt(), l.getMessage(), l.getTriggerSource()));
        }
        return out;
    }

    // ── Calendar ─────────────────────────────────────────────────────────────────

    public record InventoryDay(LocalDate date, int sellable, int booked, Integer allotment,
                               int channelStays, int channelArrivals, boolean pending) {}
    public record RateDay(LocalDate date, BigDecimal price, boolean priceOverridden, Integer minStay, Integer maxStay,
                          boolean closedToArrival, boolean closedToDeparture, boolean stopSell,
                          boolean pricePending, boolean restrictionPending) {}
    public record RatePlanRow(UUID ratePlanId, String ratePlanName, List<String> externalRatePlanIds, List<RateDay> days) {}
    public record RoomTypeRow(UUID roomTypeId, String roomTypeName, List<String> externalRoomTypeIds, boolean mapped,
                              Map<SyncType, LastSync> lastSync, List<InventoryDay> days, List<RatePlanRow> ratePlans) {}
    public record ChannelCalendar(LocalDate from, LocalDate to, List<RoomTypeRow> roomTypes) {}

    /** [from, to) for every active room type; channel/propertyId (both optional)
     *  scope which mappings and sync history count. "Pending" marks a future date
     *  whose value changed after that room type's last sync of that kind that didn't
     *  fail — i.e. the channel may still be showing the old value. */
    public ChannelCalendar calendar(UUID hotelId, LocalDate from, LocalDate to, ChannelName channel, String propertyId) {
        if (!to.isAfter(from)) throw new IllegalArgumentException("'to' must be after 'from'");
        if (from.plusDays(MAX_CALENDAR_DAYS).isBefore(to)) throw new IllegalArgumentException("At most " + MAX_CALENDAR_DAYS + " days at a time");
        LocalDate today = LocalDate.now();
        LocalDate last = to.minusDays(1);

        List<ChannelMapping> mappings = mappingRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .filter(m -> channel == null || m.getChannel() == channel)
            .filter(m -> propertyId == null || propertyId.isBlank() || propertyId.equals(m.getExternalPropertyId()))
            .toList();
        Predicate<ChannelSyncLog> inScope = l -> (channel == null || l.getChannel() == channel)
            && (propertyId == null || propertyId.isBlank() || l.getExternalPropertyId() == null || propertyId.equals(l.getExternalPropertyId()));
        List<ChannelSyncLog> recent = syncLogRepo.findTop500ByHotelIdAndDirectionOrderByCreatedAtDesc(hotelId, SyncDirection.PUSH)
            .stream().filter(inScope).toList();

        List<Reservation> reservations = reservationRepo.findByHotelIdOverlapping(hotelId, from, to);
        Map<UUID, Reservation> resById = reservations.stream().collect(Collectors.toMap(Reservation::getId, r -> r));
        Map<UUID, List<RoomReservation>> stayLinesByRoomType = resById.isEmpty() ? Map.of()
            : roomReservationRepo.findByReservationIdIn(resById.keySet()).stream()
                .collect(Collectors.groupingBy(RoomReservation::getRoomTypeId));
        List<RateChangeLog> changes = rateChangeLogRepo.findByHotelIdAndChangedAtAfterAndDateBetween(
            hotelId, LocalDateTime.of(2000, 1, 1, 0, 0), from, last);

        List<RoomTypeRow> rows = new ArrayList<>();
        for (RoomType rt : roomTypeRepo.findByHotelIdAndActiveTrue(hotelId)) {
            List<ChannelMapping> rtMappings = mappings.stream().filter(m -> m.getRoomTypeId().equals(rt.getId())).toList();
            boolean mapped = !rtMappings.isEmpty();
            String rtId = rt.getId().toString();
            List<ChannelSyncLog> rtLogs = recent.stream().filter(l -> l.getRoomTypeIds() != null && l.getRoomTypeIds().contains(rtId)).toList();
            Map<SyncType, LastSync> lastSync = lastSyncByType(rtLogs, l -> true);
            LocalDateTime invOk = lastNonFailed(rtLogs, SyncType.INVENTORY);
            LocalDateTime ratesOk = lastNonFailed(rtLogs, SyncType.RATES);
            LocalDateTime restrOk = lastNonFailed(rtLogs, SyncType.RESTRICTIONS);

            Map<LocalDate, Integer> sellable = availabilityService.availabilityCalendar(hotelId, rt.getId(), from, to);
            Map<LocalDate, Integer> allotments = inventoryRepo.findByRoomTypeIdAndDateBetween(rt.getId(), from, last).stream()
                .collect(Collectors.toMap(RoomTypeInventory::getDate, RoomTypeInventory::getAllotment, (a, b) -> a));
            List<RoomReservation> lines = stayLinesByRoomType.getOrDefault(rt.getId(), List.of());
            Set<LocalDate> invChanged = changes.stream()
                .filter(c -> rt.getId().equals(c.getRoomTypeId()) && INVENTORY_FIELDS.contains(c.getField()) && after(c.getChangedAt(), invOk))
                .map(RateChangeLog::getDate).collect(Collectors.toSet());

            List<InventoryDay> days = new ArrayList<>();
            for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) {
                final LocalDate night = d;
                int booked = 0, channelStays = 0, channelArrivals = 0;
                boolean bookingChanged = false;
                for (RoomReservation line : lines) {
                    Reservation r = resById.get(line.getReservationId());
                    if (r == null || r.getCheckInDate().isAfter(night) || !r.getCheckOutDate().isAfter(night)) continue;
                    boolean live = r.getStatus() == ReservationStatus.BOOKED || r.getStatus() == ReservationStatus.CHECKED_IN;
                    if (live) booked++;
                    if (live && r.getSource() == ReservationSource.OTA) {
                        channelStays++;
                        if (r.getCheckInDate().isEqual(night)) channelArrivals++;
                    }
                    if (after(r.getCreatedAt(), invOk) || after(r.getCancelledAt(), invOk)) bookingChanged = true;
                }
                boolean pending = mapped && !night.isBefore(today) && (invOk == null || invChanged.contains(night) || bookingChanged);
                days.add(new InventoryDay(night, sellable.getOrDefault(night, 0), booked, allotments.get(night),
                    channelStays, channelArrivals, pending));
            }

            List<RatePlanRow> planRows = new ArrayList<>();
            for (RatePlan rp : ratePlanRepo.findByRoomTypeIdAndActiveTrue(rt.getId())) {
                List<String> externalPlanIds = rtMappings.stream()
                    .filter(m -> m.getExternalRatePlanId() != null && !m.getExternalRatePlanId().isBlank())
                    .filter(m -> rp.getId().equals(m.getInternalRatePlanId()) || (m.getInternalRatePlanId() == null && isFirstPlan(rt.getId(), rp.getId())))
                    .map(ChannelMapping::getExternalRatePlanId).distinct().toList();
                boolean planMapped = !externalPlanIds.isEmpty();
                Map<LocalDate, DayPrice> dayPrices = dayPriceRepo.findByRatePlanIdAndDateBetween(rp.getId(), from, last).stream()
                    .collect(Collectors.toMap(DayPrice::getDate, dp -> dp, (a, b) -> a));
                Set<LocalDate> priceChanged = changedDates(changes, rp.getId(), RATE_FIELDS, ratesOk);
                Set<LocalDate> restrChanged = changedDates(changes, rp.getId(), RESTRICTION_FIELDS, restrOk);
                List<RateDay> rateDays = new ArrayList<>();
                for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) {
                    DayPrice dp = dayPrices.get(d);
                    boolean overridden = dp != null && dp.getPrice() != null;
                    boolean future = !d.isBefore(today);
                    rateDays.add(new RateDay(d, overridden ? dp.getPrice() : rp.getBaseRate(), overridden,
                        dp == null ? null : dp.getMinStay(), dp == null ? null : dp.getMaxStay(),
                        dp != null && Boolean.TRUE.equals(dp.getClosedToArrival()),
                        dp != null && Boolean.TRUE.equals(dp.getClosedToDeparture()),
                        dp != null && Boolean.TRUE.equals(dp.getStopSell()),
                        planMapped && future && (ratesOk == null || priceChanged.contains(d)),
                        planMapped && future && (restrOk == null || restrChanged.contains(d))));
                }
                planRows.add(new RatePlanRow(rp.getId(), rp.getName(), externalPlanIds, rateDays));
            }

            rows.add(new RoomTypeRow(rt.getId(), rt.getName(),
                rtMappings.stream().map(ChannelMapping::getExternalRoomTypeId).distinct().toList(),
                mapped, lastSync, days, planRows));
        }
        return new ChannelCalendar(from, to, rows);
    }

    private boolean isFirstPlan(UUID roomTypeId, UUID ratePlanId) {
        return ratePlanRepo.findByRoomTypeIdAndActiveTrue(roomTypeId).stream().findFirst()
            .map(rp -> rp.getId().equals(ratePlanId)).orElse(false);
    }

    private static Set<LocalDate> changedDates(List<RateChangeLog> changes, UUID ratePlanId, Set<String> fields, LocalDateTime since) {
        return changes.stream()
            .filter(c -> ratePlanId.equals(c.getRatePlanId()) && fields.contains(c.getField()) && after(c.getChangedAt(), since))
            .map(RateChangeLog::getDate).collect(Collectors.toSet());
    }

    private static LocalDateTime lastNonFailed(List<ChannelSyncLog> newestFirst, SyncType type) {
        return newestFirst.stream()
            .filter(l -> l.getSyncType() == type && l.getStatus() != SyncStatus.FAILED)
            .map(ChannelSyncLog::getCreatedAt).filter(Objects::nonNull).findFirst().orElse(null);
    }

    private static boolean after(LocalDateTime t, LocalDateTime since) {
        return t != null && (since == null || t.isAfter(since));
    }

    // ── Logs & bookings ──────────────────────────────────────────────────────────

    public record PageResult<T>(List<T> items, long total, int page, int size) {}

    public PageResult<ChannelSyncLog> logs(UUID hotelId, ChannelName channel, SyncType type, SyncStatus status,
                                           SyncDirection direction, UUID roomTypeId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<ChannelSyncLog> p = syncLogRepo.search(hotelId, channel, type, status, direction,
            roomTypeId == null ? null : roomTypeId.toString(), PageRequest.of(Math.max(page, 0), safeSize));
        return new PageResult<>(p.getContent(), p.getTotalElements(), p.getNumber(), safeSize);
    }

    public record ChannelBookingRow(UUID id, ChannelName channel, String ota, String externalBookingId, String lastStatus,
                                    LocalDateTime receivedAt, LocalDateTime updatedAt, UUID reservationId,
                                    String guestName, LocalDate checkIn, LocalDate checkOut, String reservationStatus,
                                    int rooms, List<String> roomTypes) {}

    public PageResult<ChannelBookingRow> bookings(UUID hotelId, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 200);
        Page<ChannelBooking> p = channelBookingRepo.findByHotelIdOrderByCreatedAtDesc(hotelId, PageRequest.of(Math.max(page, 0), safeSize));
        Set<UUID> resIds = p.getContent().stream().map(ChannelBooking::getReservationId).collect(Collectors.toSet());
        Map<UUID, Reservation> res = reservationRepo.findAllById(resIds).stream().collect(Collectors.toMap(Reservation::getId, r -> r));
        Map<UUID, List<RoomReservation>> lines = resIds.isEmpty() ? Map.of()
            : roomReservationRepo.findByReservationIdIn(resIds).stream().collect(Collectors.groupingBy(RoomReservation::getReservationId));
        Map<UUID, String> rtNames = roomTypeRepo.findByHotelIdAndActiveTrue(hotelId).stream()
            .collect(Collectors.toMap(RoomType::getId, RoomType::getName));
        List<ChannelBookingRow> rows = p.getContent().stream().map(b -> {
            Reservation r = res.get(b.getReservationId());
            List<RoomReservation> ls = lines.getOrDefault(b.getReservationId(), List.of());
            return new ChannelBookingRow(b.getId(), b.getChannel(), b.getOta(), b.getExternalBookingId(), b.getLastStatus(),
                b.getCreatedAt(), b.getUpdatedAt(), b.getReservationId(),
                r == null ? null : r.getGuestName(), r == null ? null : r.getCheckInDate(), r == null ? null : r.getCheckOutDate(),
                r == null ? null : r.getStatus().name(), ls.size(),
                ls.stream().map(l -> rtNames.getOrDefault(l.getRoomTypeId(), "?")).distinct().toList());
        }).toList();
        return new PageResult<>(rows, p.getTotalElements(), p.getNumber(), safeSize);
    }

    private static String hint(String key) {
        if (key == null || key.isBlank()) return null;
        return key.length() <= 6 ? "••••" : key.substring(0, 4) + "••••" + key.substring(key.length() - 2);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
