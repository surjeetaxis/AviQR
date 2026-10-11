package in.aviqr.pms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelSyncLogRepository;
import in.aviqr.pms.repository.DayPriceRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ARI push to the AxisRooms channel manager, with AviQR registered there as the hotel's
 * PMS. AviQR is the source of truth: every push sends the full state for the whole
 * horizon (not deltas), so a value cleared here — a lifted stop-sell, a removed
 * min-stay — is cleared in the channel manager too.
 *
 * Contract (AxisRooms generic PMS API, all JSON POSTs authenticated by accessKey +
 * channelId in the body, where channelId is the PMS id AxisRooms issued for AviQR):
 *   /api/inventory         per-room availability ranges
 *   /api/bulkPriceUpdate   per-room/rate-plan occupancy prices ("Single", "Double", …)
 *   /api/cm-restrictions   Master (stop-sell) / CTA / CTD open-close, and min/max stay
 * Dates are yyyy-MM-dd with an inclusive endDate. AxisRooms answers HTTP 200 even on
 * failure, so success is read from the body's "status" field, never the HTTP code.
 */
@Service @RequiredArgsConstructor @Slf4j
public class AxisRoomsAriService {

    // AxisRooms rate-type names, indexed by occupancy - 1.
    private static final List<String> OCCUPANCY_KEYS = List.of(
        "Single", "Double", "Triple", "Quad", "Five Person", "Six Person", "Seven Person", "Eight Person");
    // AxisRooms numbers days Sunday=1 … Saturday=7, and an empty list means "no days",
    // so every range has to name all seven explicitly.
    private static final List<Integer> ALL_DAYS = List.of(1, 2, 3, 4, 5, 6, 7);

    private final AvailabilityService availabilityService;
    private final RatePlanRepository ratePlanRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final DayPriceRepository dayPriceRepo;
    private final ChannelSyncLogRepository syncLogRepo;
    private final ObjectMapper objectMapper;
    @Qualifier("externalRestTemplate") private final RestTemplate externalRestTemplate;

    // Default window when a push names no dates. AxisRooms rejects inventory updates
    // more than 450 days out, so an explicit range is capped there.
    @Value("${channel.axisrooms.horizon-days:365}")
    private int horizonDays;
    static final int MAX_DAYS_AHEAD = 450;

    /** What to push: any mix of inventory / rates / restrictions, an optional date
     *  range (inclusive; null = today .. horizon), and who/what asked for it — the
     *  last two only label the sync-log rows. */
    public record PushRequest(Set<SyncType> types, LocalDate from, LocalDate to, String trigger, String triggeredBy) {
        public static PushRequest of(Set<SyncType> types, String trigger) {
            return new PushRequest(types, null, null, trigger, null);
        }
    }

    public static final Set<SyncType> ARI_TYPES = EnumSet.of(SyncType.INVENTORY, SyncType.RATES, SyncType.RESTRICTIONS);

    /** Pushes the requested parts for every live mapping given; returns the sync-log
     *  rows written (one per request sent, or per failure before sending). */
    public List<ChannelSyncLog> push(List<ChannelMapping> mappings, PushRequest req) {
        Window w = window(req);
        List<ChannelSyncLog> out = new ArrayList<>();
        forEachConnection(mappings, (conn, ms) -> {
            Job job = new Job(conn, w, req, out);
            if (req.types().contains(SyncType.INVENTORY)) pushInventory(job, ms);
            if (req.types().contains(SyncType.RATES)) pushRates(job, ms);
            if (req.types().contains(SyncType.RESTRICTIONS)) pushRestrictions(job, ms);
        });
        return out;
    }

    /** Inventory, prices and restrictions for every live mapping given. */
    public List<ChannelSyncLog> pushAll(List<ChannelMapping> mappings) {
        return push(mappings, PushRequest.of(ARI_TYPES, "MANUAL"));
    }

    /** Availability only — what a booking, cancellation or stay change affects. */
    public List<ChannelSyncLog> pushInventoryOnly(List<ChannelMapping> mappings) {
        return push(mappings, PushRequest.of(EnumSet.of(SyncType.INVENTORY), "RESERVATION"));
    }

    /** [from, to) actually pushed: never before today, never past AxisRooms' limit. */
    record Window(LocalDate from, LocalDate to) {}

    Window window(PushRequest req) {
        LocalDate today = LocalDate.now();
        LocalDate from = req.from() == null || req.from().isBefore(today) ? today : req.from();
        LocalDate cap = today.plusDays(MAX_DAYS_AHEAD);
        LocalDate to = req.to() == null ? today.plusDays(horizonDays) : req.to().plusDays(1);
        if (to.isAfter(cap)) to = cap;
        if (!to.isAfter(from)) throw new IllegalArgumentException("Nothing to sync: the date range is in the past or empty");
        return new Window(from, to);
    }

    private record Job(Connection conn, Window w, PushRequest req, List<ChannelSyncLog> out) {}

    // One AxisRooms request covers one property on one connection, so mappings are
    // grouped by (base URL, accessKey, channelId, property) before building payloads.
    private record Connection(UUID hotelId, ChannelName channel, String baseUrl, String accessKey,
                              String channelId, String propertyId) {}

    private void forEachConnection(List<ChannelMapping> mappings,
                                   java.util.function.BiConsumer<Connection, List<ChannelMapping>> action) {
        Map<Connection, List<ChannelMapping>> byConnection = mappings.stream()
            .filter(m -> Boolean.TRUE.equals(m.getActive()))
            .filter(m -> m.getCmBaseUrl() != null && !m.getCmBaseUrl().isBlank())
            .collect(Collectors.groupingBy(m -> new Connection(m.getHotelId(), m.getChannel(),
                    stripTrailingSlash(m.getCmBaseUrl()), m.getAccessKey(), m.getChannelId(), m.getExternalPropertyId()),
                LinkedHashMap::new, Collectors.toList()));
        byConnection.forEach(action);
    }

    // ── Inventory ────────────────────────────────────────────────────────────────

    private void pushInventory(Job job, List<ChannelMapping> mappings) {
        Connection conn = job.conn();
        LocalDate from = job.w().from(), to = job.w().to();
        List<Map<String, Object>> rooms = new ArrayList<>();
        // Inventory is per room type; several rate-plan mappings on one room share it.
        Map<String, UUID> roomTypeByExternalId = new LinkedHashMap<>();
        mappings.forEach(m -> roomTypeByExternalId.putIfAbsent(m.getExternalRoomTypeId(), m.getRoomTypeId()));
        try {
            roomTypeByExternalId.forEach((externalRoomId, roomTypeId) -> {
                Map<LocalDate, Integer> calendar = availabilityService.availabilityCalendar(conn.hotelId(), roomTypeId, from, to);
                for (Range<Integer> r : ranges(calendar)) {
                    rooms.add(ordered(
                        "roomId", externalRoomId,
                        "startDate", r.start().toString(),
                        "endDate", r.end().toString(),
                        "availability", r.value()));
                }
            });
        } catch (Exception e) {
            logFailure(job, SyncType.INVENTORY, roomTypeIds(mappings), "Inventory push failed before sending: " + e.getMessage(), null, e);
            return;
        }
        send(job, SyncType.INVENTORY, roomTypeIds(mappings), "/api/inventory", "inventory for "
            + roomTypeByExternalId.size() + " room type(s), " + from + " to " + to.minusDays(1), hotelEnvelope(conn, rooms));
    }

    // ── Prices ───────────────────────────────────────────────────────────────────

    private void pushRates(Job job, List<ChannelMapping> mappings) {
        Connection conn = job.conn();
        LocalDate from = job.w().from(), to = job.w().to();
        Map<String, Map<String, List<ChannelMapping>>> byRoomThenPlan = groupByRoomThenPlan(mappings);
        if (byRoomThenPlan.isEmpty()) return;
        Set<UUID> roomTypeIds = roomTypeIds(ratePlanMappings(mappings));
        List<Map<String, Object>> rooms = new ArrayList<>();
        try {
            byRoomThenPlan.forEach((externalRoomId, plans) -> {
                List<Map<String, Object>> rateplans = new ArrayList<>();
                plans.forEach((externalPlanId, planMappings) -> {
                    Map<LocalDate, Map<String, Double>> calendar = priceCalendar(planMappings, from, to);
                    List<Map<String, Object>> priceDetails = ranges(calendar).stream()
                        .filter(r -> !r.value().isEmpty())
                        .map(r -> ordered(
                            "startDate", r.start().toString(),
                            "endDate", r.end().toString(),
                            "price", r.value()))
                        .toList();
                    if (!priceDetails.isEmpty())
                        rateplans.add(ordered("rateplanId", externalPlanId, "priceDetails", priceDetails));
                });
                if (!rateplans.isEmpty()) rooms.add(ordered("roomId", externalRoomId, "rateplans", rateplans));
            });
        } catch (Exception e) {
            logFailure(job, SyncType.RATES, roomTypeIds, "Price push failed before sending: " + e.getMessage(), null, e);
            return;
        }
        if (rooms.isEmpty()) return;
        send(job, SyncType.RATES, roomTypeIds, "/api/bulkPriceUpdate", "prices " + from + " to " + to.minusDays(1), hotelEnvelope(conn, rooms));
    }

    /** Per-night occupancy price map for one AxisRooms rate plan. Several of our plans
     *  can feed it: an occupancy-specific plan (RatePlan.occupancy set) fills just its
     *  own tier, a plain plan fills every tier up to the room type's max occupancy that
     *  an occupancy-specific plan hasn't already priced. */
    private Map<LocalDate, Map<String, Double>> priceCalendar(List<ChannelMapping> planMappings, LocalDate from, LocalDate to) {
        List<RatePlan> plans = planMappings.stream().map(this::internalRatePlan).distinct().toList();
        UUID roomTypeId = planMappings.get(0).getRoomTypeId();
        int maxOccupancy = roomTypeRepo.findById(roomTypeId).map(RoomType::getMaxOccupancy).filter(Objects::nonNull).orElse(2);
        int tiers = Math.max(1, Math.min(maxOccupancy, OCCUPANCY_KEYS.size()));

        Map<UUID, Map<LocalDate, DayPrice>> overrides = new HashMap<>();
        for (RatePlan p : plans) overrides.put(p.getId(), dayPrices(p.getId(), from, to));

        Map<LocalDate, Map<String, Double>> calendar = new LinkedHashMap<>();
        for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) {
            Map<String, Double> prices = new LinkedHashMap<>();
            for (RatePlan p : plans) {
                if (p.getOccupancy() == null) continue;
                int idx = p.getOccupancy() - 1;
                if (idx >= 0 && idx < OCCUPANCY_KEYS.size()) prices.put(OCCUPANCY_KEYS.get(idx), rate(p, overrides.get(p.getId()).get(d)));
            }
            for (RatePlan p : plans) {
                if (p.getOccupancy() != null) continue;
                double r = rate(p, overrides.get(p.getId()).get(d));
                for (int i = 0; i < tiers; i++) prices.putIfAbsent(OCCUPANCY_KEYS.get(i), r);
            }
            calendar.put(d, sortByTier(prices));
        }
        return calendar;
    }

    private double rate(RatePlan plan, DayPrice override) {
        BigDecimal price = override != null && override.getPrice() != null ? override.getPrice() : plan.getBaseRate();
        return price.doubleValue();
    }

    private Map<String, Double> sortByTier(Map<String, Double> prices) {
        Map<String, Double> sorted = new LinkedHashMap<>();
        OCCUPANCY_KEYS.forEach(k -> { if (prices.containsKey(k)) sorted.put(k, prices.get(k)); });
        return sorted;
    }

    // ── Restrictions ─────────────────────────────────────────────────────────────

    /** Sent as four separate requests (Master, CTA, CTD, min/max stay) because
     *  AxisRooms narrows the target OTAs by intersecting the support lists of every
     *  restriction type in one request, so mixing types would silently drop e.g. a
     *  stop-sell for an OTA that doesn't support CTD. */
    private void pushRestrictions(Job job, List<ChannelMapping> mappings) {
        LocalDate from = job.w().from(), to = job.w().to();
        Map<String, Map<String, List<ChannelMapping>>> byRoomThenPlan = groupByRoomThenPlan(mappings);
        if (byRoomThenPlan.isEmpty()) return;
        Set<UUID> roomTypeIds = roomTypeIds(ratePlanMappings(mappings));
        Connection conn = job.conn();

        Map<String, Function<DayPrice, Boolean>> flags = new LinkedHashMap<>();
        flags.put("Master", dp -> dp != null && Boolean.TRUE.equals(dp.getStopSell()));
        flags.put("CTA", dp -> dp != null && Boolean.TRUE.equals(dp.getClosedToArrival()));
        flags.put("CTD", dp -> dp != null && Boolean.TRUE.equals(dp.getClosedToDeparture()));

        Map<String, Map<LocalDate, DayPrice>> dayPricesByPlan = new HashMap<>();
        try {
            byRoomThenPlan.values().forEach(plans -> plans.forEach((externalPlanId, ms) ->
                dayPricesByPlan.put(ms.get(0).getExternalRoomTypeId() + "|" + externalPlanId,
                    dayPrices(internalRatePlan(ms.get(0)).getId(), from, to))));
        } catch (Exception e) {
            logFailure(job, SyncType.RESTRICTIONS, roomTypeIds, "Restriction push failed before sending: " + e.getMessage(), null, e);
            return;
        }

        flags.forEach((resType, isClosed) -> {
            List<Map<String, Object>> rooms = buildRestrictionRooms(byRoomThenPlan, (externalRoomId, externalPlanId) -> {
                Map<LocalDate, DayPrice> dps = dayPricesByPlan.get(externalRoomId + "|" + externalPlanId);
                Map<LocalDate, Boolean> calendar = new LinkedHashMap<>();
                for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) calendar.put(d, isClosed.apply(dps.get(d)));
                return Map.of("restrictions", ranges(calendar).stream()
                    .map(r -> ordered(
                        "startDate", r.start().toString(),
                        "endDate", r.end().toString(),
                        "resType", resType,
                        "reStatus", r.value() ? "Close" : "Open",
                        "Dow", ALL_DAYS))
                    .toList());
            });
            send(job, SyncType.RESTRICTIONS, roomTypeIds, "/api/cm-restrictions",
                RESTRICTION_LABELS.get(resType) + " " + from + " to " + to.minusDays(1), hotelEnvelope(conn, rooms));
        });

        List<Map<String, Object>> mlosRooms = buildRestrictionRooms(byRoomThenPlan, (externalRoomId, externalPlanId) -> {
            Map<LocalDate, DayPrice> dps = dayPricesByPlan.get(externalRoomId + "|" + externalPlanId);
            Map<LocalDate, List<Integer>> calendar = new LinkedHashMap<>();
            for (LocalDate d = from; d.isBefore(to); d = d.plusDays(1)) {
                DayPrice dp = dps.get(d);
                // AxisRooms treats maxlos 0 as "no maximum"; minlos 1 is "no minimum".
                int min = dp != null && dp.getMinStay() != null ? Math.max(1, dp.getMinStay()) : 1;
                int max = dp != null && dp.getMaxStay() != null ? dp.getMaxStay() : 0;
                calendar.put(d, List.of(min, max));
            }
            return Map.of("mlosDetails", ranges(calendar).stream()
                .map(r -> ordered(
                    "startDate", r.start().toString(),
                    "endDate", r.end().toString(),
                    "minlos", r.value().get(0),
                    "maxlos", r.value().get(1),
                    "Dow", ALL_DAYS))
                .toList());
        });
        send(job, SyncType.RESTRICTIONS, roomTypeIds, "/api/cm-restrictions",
            "min/max stay " + from + " to " + to.minusDays(1), hotelEnvelope(conn, mlosRooms));
    }

    private static final Map<String, String> RESTRICTION_LABELS = Map.of(
        "Master", "stop-sell", "CTA", "closed-to-arrival", "CTD", "closed-to-departure");

    private List<Map<String, Object>> buildRestrictionRooms(
            Map<String, Map<String, List<ChannelMapping>>> byRoomThenPlan,
            java.util.function.BiFunction<String, String, Map<String, Object>> planBody) {
        List<Map<String, Object>> rooms = new ArrayList<>();
        byRoomThenPlan.forEach((externalRoomId, plans) -> {
            List<Map<String, Object>> rateplans = new ArrayList<>();
            plans.keySet().forEach(externalPlanId -> {
                Map<String, Object> rp = new LinkedHashMap<>();
                rp.put("rateplanId", externalPlanId);
                rp.putAll(planBody.apply(externalRoomId, externalPlanId));
                rateplans.add(rp);
            });
            rooms.add(ordered("roomId", externalRoomId, "rateplans", rateplans));
        });
        return rooms;
    }

    // ── Shared helpers ───────────────────────────────────────────────────────────

    /** externalRoomTypeId → externalRatePlanId → mappings; mappings without an
     *  AxisRooms rate plan id carry inventory only and are left out. */
    private Map<String, Map<String, List<ChannelMapping>>> groupByRoomThenPlan(List<ChannelMapping> mappings) {
        return mappings.stream()
            .filter(m -> m.getExternalRatePlanId() != null && !m.getExternalRatePlanId().isBlank())
            .collect(Collectors.groupingBy(ChannelMapping::getExternalRoomTypeId, LinkedHashMap::new,
                Collectors.groupingBy(ChannelMapping::getExternalRatePlanId, LinkedHashMap::new, Collectors.toList())));
    }

    private static List<ChannelMapping> ratePlanMappings(List<ChannelMapping> mappings) {
        return mappings.stream().filter(m -> m.getExternalRatePlanId() != null && !m.getExternalRatePlanId().isBlank()).toList();
    }

    private static Set<UUID> roomTypeIds(List<ChannelMapping> mappings) {
        return mappings.stream().map(ChannelMapping::getRoomTypeId).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private RatePlan internalRatePlan(ChannelMapping m) {
        if (m.getInternalRatePlanId() != null) {
            return ratePlanRepo.findById(m.getInternalRatePlanId())
                .orElseThrow(() -> new RuntimeException("Mapped rate plan not found: " + m.getInternalRatePlanId()));
        }
        return ratePlanRepo.findByRoomTypeIdAndActiveTrue(m.getRoomTypeId()).stream().findFirst()
            .orElseThrow(() -> new RuntimeException("No active rate plan for room type " + m.getRoomTypeId()));
    }

    private Map<LocalDate, DayPrice> dayPrices(UUID ratePlanId, LocalDate from, LocalDate to) {
        return dayPriceRepo.findByRatePlanIdAndDateBetween(ratePlanId, from, to.minusDays(1)).stream()
            .collect(Collectors.toMap(DayPrice::getDate, dp -> dp, (a, b) -> a));
    }

    record Range<T>(LocalDate start, LocalDate end, T value) {}

    /** Collapses consecutive dates with an equal value into inclusive ranges. */
    static <T> List<Range<T>> ranges(Map<LocalDate, T> calendar) {
        List<Range<T>> out = new ArrayList<>();
        LocalDate start = null, prev = null;
        T current = null;
        for (Map.Entry<LocalDate, T> e : new TreeMap<>(calendar).entrySet()) {
            if (start != null && e.getKey().equals(prev.plusDays(1)) && Objects.equals(e.getValue(), current)) {
                prev = e.getKey();
                continue;
            }
            if (start != null) out.add(new Range<>(start, prev, current));
            start = prev = e.getKey();
            current = e.getValue();
        }
        if (start != null) out.add(new Range<>(start, prev, current));
        return out;
    }

    private Map<String, Object> hotelEnvelope(Connection conn, List<Map<String, Object>> rooms) {
        return ordered(
            "accessKey", conn.accessKey(),
            "channelId", conn.channelId(),
            "hotels", List.of(ordered("hotelId", conn.propertyId(), "rooms", rooms)));
    }

    private void send(Job job, SyncType type, Set<UUID> roomTypeIds, String path, String summary, Map<String, Object> body) {
        String json = toJson(body);
        String logJson = redactedRequestJson(body);
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> resp = externalRestTemplate.postForEntity(
                job.conn().baseUrl() + path, new HttpEntity<>(json, headers), String.class);
            String message = responseMessage(resp.getBody());
            boolean ok = resp.getStatusCode().is2xxSuccessful() && isSuccess(resp.getBody());
            SyncStatus status = ok ? SyncStatus.SUCCESS : isNothingToApply(message) ? SyncStatus.SKIPPED : SyncStatus.FAILED;
            String text = switch (status) {
                case SUCCESS -> "Pushed " + summary;
                case SKIPPED -> "Skipped " + summary + " — no OTA is connected to this hotel in the channel manager,"
                    + " so it has nowhere to apply them. Connect an OTA there and sync again.";
                case FAILED -> "Rejected " + summary + (message.isBlank() ? "" : " — " + message);
            };
            ChannelSyncLog row = logRow(job, type, roomTypeIds, status, text)
                .requestBody(logJson)
                .responseBody("HTTP " + resp.getStatusCode().value() + (resp.getBody() != null ? "\n" + resp.getBody() : ""))
                .build();
            job.out().add(syncLogRepo.save(row));
        } catch (Exception e) {
            logFailure(job, type, roomTypeIds, "Push of " + summary + " to " + path + " failed: " + e.getMessage(), logJson, e);
        }
    }

    private String redactedRequestJson(Map<String, Object> body) {
        Map<String, Object> safe = new LinkedHashMap<>(body);
        if (safe.containsKey("accessKey")) safe.put("accessKey", "[REDACTED]");
        return toJson(safe);
    }

    /** AxisRooms answers "no ota connected" when the hotel has no OTA that could take
     *  the update (restrictions/MLOS are stored per OTA rate plan, not centrally). */
    private static boolean isNothingToApply(String message) {
        return message != null && message.toLowerCase().contains("no ota connected");
    }

    private ChannelSyncLog.ChannelSyncLogBuilder logRow(Job job, SyncType type, Set<UUID> roomTypeIds, SyncStatus status, String message) {
        return ChannelSyncLog.builder()
            .hotelId(job.conn().hotelId()).channel(job.conn().channel()).direction(SyncDirection.PUSH)
            .status(status).syncType(type)
            .externalPropertyId(job.conn().propertyId())
            .roomTypeIds(roomTypeIds.stream().map(UUID::toString).collect(Collectors.joining(",")))
            .dateFrom(job.w().from()).dateTo(job.w().to().minusDays(1))
            .triggerSource(job.req().trigger()).triggeredBy(job.req().triggeredBy())
            .message(truncate(message, 2000));
    }

    private boolean isSuccess(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            JsonNode status = node.has("status") ? node.get("status") : node.get("Status");
            return status != null && "success".equalsIgnoreCase(status.asText());
        } catch (Exception e) {
            return false;
        }
    }

    private String responseMessage(String body) {
        try {
            JsonNode msg = objectMapper.readTree(body).get("message");
            return msg != null && !msg.isNull() ? msg.asText().trim() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private void logFailure(Job job, SyncType type, Set<UUID> roomTypeIds, String message, String requestJson, Exception e) {
        log.warn("AxisRooms ARI [{} / {}]: {}", job.conn().hotelId(), job.conn().propertyId(), message);
        job.out().add(syncLogRepo.save(logRow(job, type, roomTypeIds, SyncStatus.FAILED, message)
            .requestBody(requestJson)
            .responseBody("error: " + e.getMessage())
            .build()));
    }

    private static Map<String, Object> ordered(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); }
        catch (Exception e) { throw new RuntimeException("Could not serialize ARI payload", e); }
    }

    private static String stripTrailingSlash(String url) {
        String u = url.trim();
        return u.endsWith("/") ? u.substring(0, u.length() - 1) : u;
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
