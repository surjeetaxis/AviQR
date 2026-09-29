package in.aviqr.pms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelSyncLogRepository;
import in.aviqr.pms.repository.DayPriceRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AxisRoomsAriServiceTest {

    @Mock AvailabilityService availabilityService;
    @Mock RatePlanRepository ratePlanRepo;
    @Mock RoomTypeRepository roomTypeRepo;
    @Mock DayPriceRepository dayPriceRepo;
    @Mock ChannelSyncLogRepository syncLogRepo;
    @Mock RestTemplate restTemplate;
    @Spy ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks AxisRoomsAriService service;

    private static final ObjectMapper JSON = new ObjectMapper();
    private final UUID hotelId = UUID.randomUUID();
    private final UUID roomTypeId = UUID.randomUUID();
    private final LocalDate today = LocalDate.now();
    private RatePlan plan;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "horizonDays", 5);
        plan = RatePlan.builder().id(UUID.randomUUID()).hotelId(hotelId).roomTypeId(roomTypeId)
            .name("Room Only").baseRate(new BigDecimal("3000.00")).build();
        when(ratePlanRepo.findById(plan.getId())).thenReturn(Optional.of(plan));
        when(roomTypeRepo.findById(roomTypeId)).thenReturn(Optional.of(
            RoomType.builder().id(roomTypeId).hotelId(hotelId).name("Deluxe").maxOccupancy(2).build()));
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
            .thenReturn(ResponseEntity.ok("{\"status\":\"Success\",\"message\":\"\"}"));
    }

    private ChannelMapping mapping() {
        return ChannelMapping.builder().id(UUID.randomUUID()).hotelId(hotelId).roomTypeId(roomTypeId)
            .channel(ChannelName.AXISROOMS).externalPropertyId("AX-HOTEL-1").externalRoomTypeId("AX-ROOM-1")
            .externalRatePlanId("AX-RP-1").internalRatePlanId(plan.getId())
            .accessKey("key-123").channelId("999").cmBaseUrl("https://cm.example.com/").active(true)
            .webhookSecret("s").build();
    }

    private Map<LocalDate, Integer> availability(int... perDay) {
        Map<LocalDate, Integer> m = new LinkedHashMap<>();
        for (int i = 0; i < perDay.length; i++) m.put(today.plusDays(i), perDay[i]);
        return m;
    }

    /** url → JSON bodies posted to it, in order. */
    private Map<String, List<JsonNode>> captureCalls() throws Exception {
        ArgumentCaptor<String> url = ArgumentCaptor.forClass(String.class);
        @SuppressWarnings({"unchecked", "rawtypes"})
        ArgumentCaptor<HttpEntity<String>> entity = (ArgumentCaptor) ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate, atLeastOnce()).postForEntity(url.capture(), entity.capture(), eq(String.class));
        Map<String, List<JsonNode>> calls = new LinkedHashMap<>();
        for (int i = 0; i < url.getAllValues().size(); i++) {
            calls.computeIfAbsent(url.getAllValues().get(i), k -> new ArrayList<>())
                .add(JSON.readTree(entity.getAllValues().get(i).getBody()));
        }
        return calls;
    }

    @Test
    @DisplayName("ranges() collapses equal consecutive values into inclusive ranges")
    void rangesCollapse() {
        Map<LocalDate, Integer> cal = availability(2, 2, 1, 1, 2);
        var ranges = AxisRoomsAriService.ranges(cal);
        assertThat(ranges).hasSize(3);
        assertThat(ranges.get(0)).isEqualTo(new AxisRoomsAriService.Range<>(today, today.plusDays(1), 2));
        assertThat(ranges.get(1)).isEqualTo(new AxisRoomsAriService.Range<>(today.plusDays(2), today.plusDays(3), 1));
        assertThat(ranges.get(2)).isEqualTo(new AxisRoomsAriService.Range<>(today.plusDays(4), today.plusDays(4), 2));
    }

    @Test
    @DisplayName("pushAll sends inventory, prices and 4 restriction calls with AxisRooms' payload shape")
    void pushAllPayloads() throws Exception {
        when(availabilityService.availabilityCalendar(hotelId, roomTypeId, today, today.plusDays(5)))
            .thenReturn(availability(3, 3, 0, 2, 2));
        when(dayPriceRepo.findByRatePlanIdAndDateBetween(plan.getId(), today, today.plusDays(4))).thenReturn(List.of(
            DayPrice.builder().ratePlanId(plan.getId()).date(today.plusDays(2)).price(new BigDecimal("4500")).stopSell(true).minStay(2).build(),
            DayPrice.builder().ratePlanId(plan.getId()).date(today.plusDays(3)).closedToArrival(true).build()));

        service.pushAll(List.of(mapping()));

        Map<String, List<JsonNode>> calls = captureCalls();
        assertThat(calls.keySet()).containsExactly(
            "https://cm.example.com/api/inventory",
            "https://cm.example.com/api/bulkPriceUpdate",
            "https://cm.example.com/api/cm-restrictions");

        JsonNode inv = calls.get("https://cm.example.com/api/inventory").get(0);
        assertThat(inv.get("accessKey").asText()).isEqualTo("key-123");
        assertThat(inv.get("channelId").asText()).isEqualTo("999");
        assertThat(inv.at("/hotels/0/hotelId").asText()).isEqualTo("AX-HOTEL-1");
        JsonNode invRooms = inv.at("/hotels/0/rooms");
        assertThat(invRooms).hasSize(3);
        assertThat(invRooms.get(0).get("roomId").asText()).isEqualTo("AX-ROOM-1");
        assertThat(invRooms.get(0).get("startDate").asText()).isEqualTo(today.toString());
        assertThat(invRooms.get(0).get("endDate").asText()).isEqualTo(today.plusDays(1).toString());
        assertThat(invRooms.get(0).get("availability").asInt()).isEqualTo(3);
        assertThat(invRooms.get(1).get("availability").asInt()).isZero();

        JsonNode price = calls.get("https://cm.example.com/api/bulkPriceUpdate").get(0);
        JsonNode details = price.at("/hotels/0/rooms/0/rateplans/0/priceDetails");
        assertThat(price.at("/hotels/0/rooms/0/rateplans/0/rateplanId").asText()).isEqualTo("AX-RP-1");
        assertThat(details).hasSize(3);
        assertThat(details.get(0).at("/price/Single").asDouble()).isEqualTo(3000.0);
        assertThat(details.get(0).at("/price/Double").asDouble()).isEqualTo(3000.0);
        assertThat(details.get(0).at("/price").has("Triple")).isFalse();   // maxOccupancy 2
        assertThat(details.get(1).get("startDate").asText()).isEqualTo(today.plusDays(2).toString());
        assertThat(details.get(1).at("/price/Single").asDouble()).isEqualTo(4500.0);

        List<JsonNode> restrictions = calls.get("https://cm.example.com/api/cm-restrictions");
        assertThat(restrictions).hasSize(4);
        JsonNode master = restrictions.get(0).at("/hotels/0/rooms/0/rateplans/0/restrictions");
        assertThat(master).hasSize(3);
        assertThat(master.get(0).get("resType").asText()).isEqualTo("Master");
        assertThat(master.get(0).get("reStatus").asText()).isEqualTo("Open");
        assertThat(master.get(1).get("reStatus").asText()).isEqualTo("Close");
        assertThat(master.get(1).get("startDate").asText()).isEqualTo(today.plusDays(2).toString());
        assertThat(master.get(1).get("endDate").asText()).isEqualTo(today.plusDays(2).toString());
        assertThat(master.get(0).get("Dow")).hasSize(7);
        assertThat(restrictions.get(1).at("/hotels/0/rooms/0/rateplans/0/restrictions/0/resType").asText()).isEqualTo("CTA");
        assertThat(restrictions.get(2).at("/hotels/0/rooms/0/rateplans/0/restrictions/0/resType").asText()).isEqualTo("CTD");
        JsonNode mlos = restrictions.get(3).at("/hotels/0/rooms/0/rateplans/0/mlosDetails");
        assertThat(mlos.get(0).get("minlos").asInt()).isEqualTo(1);
        assertThat(mlos.get(0).get("maxlos").asInt()).isZero();
        assertThat(mlos.get(1).get("minlos").asInt()).isEqualTo(2);

        verify(syncLogRepo, times(6)).save(argThat(l -> l.getStatus() == SyncStatus.SUCCESS));
    }

    @Test
    @DisplayName("an AxisRooms error body on HTTP 200 is logged as FAILED")
    void errorBodyIsFailure() {
        when(availabilityService.availabilityCalendar(any(), any(), any(), any())).thenReturn(availability(1, 1, 1, 1, 1));
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
            .thenReturn(ResponseEntity.ok("{\"status\":\"Error\",\"message\":\"roomId AX-ROOM-1 not mapped in Channel Manager.\"}"));

        service.pushInventoryOnly(List.of(mapping()));

        ArgumentCaptor<ChannelSyncLog> log = ArgumentCaptor.forClass(ChannelSyncLog.class);
        verify(syncLogRepo).save(log.capture());
        assertThat(log.getValue().getStatus()).isEqualTo(SyncStatus.FAILED);
        assertThat(log.getValue().getMessage()).contains("not mapped");
    }

    @Test
    @DisplayName("occupancy-specific plans fill only their own tier")
    void occupancyTiers() throws Exception {
        RatePlan single = RatePlan.builder().id(UUID.randomUUID()).roomTypeId(roomTypeId).hotelId(hotelId)
            .name("Single").baseRate(new BigDecimal("2000")).occupancy(1).build();
        when(ratePlanRepo.findById(single.getId())).thenReturn(Optional.of(single));
        when(availabilityService.availabilityCalendar(any(), any(), any(), any())).thenReturn(availability(1, 1, 1, 1, 1));
        ChannelMapping doubleMapping = mapping();
        ChannelMapping singleMapping = mapping();
        singleMapping.setInternalRatePlanId(single.getId());

        service.pushAll(List.of(doubleMapping, singleMapping));

        JsonNode price = captureCalls().get("https://cm.example.com/api/bulkPriceUpdate").get(0)
            .at("/hotels/0/rooms/0/rateplans/0/priceDetails/0/price");
        assertThat(price.get("Single").asDouble()).isEqualTo(2000.0);
        assertThat(price.get("Double").asDouble()).isEqualTo(3000.0);
    }

    @Test
    @DisplayName("mappings without a cmBaseUrl are never sent")
    void skipsSimulatedMappings() {
        ChannelMapping m = mapping();
        m.setCmBaseUrl(" ");
        service.pushAll(List.of(m));
        verifyNoInteractions(restTemplate);
    }
}
