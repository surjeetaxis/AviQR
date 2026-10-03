package in.aviqr.pms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelBookingRepository;
import in.aviqr.pms.repository.ChannelMappingRepository;
import in.aviqr.pms.repository.ChannelSyncLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChannelServiceSyncTest {

    @Mock ChannelMappingRepository mappingRepo;
    @Mock ChannelBookingRepository channelBookingRepo;
    @Mock ChannelSyncLogRepository syncLogRepo;
    @Mock ReservationService reservationService;
    @Mock AvailabilityService availabilityService;
    @Mock AxisRoomsAriService ariService;
    @Spy ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks ChannelService service;

    private final UUID hotelId = UUID.randomUUID();
    private final UUID deluxe = UUID.randomUUID();
    private final UUID suite = UUID.randomUUID();

    private ChannelMapping mapping(UUID roomTypeId, String externalRoom, String externalPlan) {
        return ChannelMapping.builder().id(UUID.randomUUID()).hotelId(hotelId).roomTypeId(roomTypeId)
            .channel(ChannelName.AXISROOMS).externalPropertyId("12").externalRoomTypeId(externalRoom)
            .externalRatePlanId(externalPlan).accessKey("k").channelId("232").cmBaseUrl("https://api.axisrooms.com")
            .active(true).webhookSecret("s").build();
    }

    @Test
    @DisplayName("sync pushes only the chosen room types, types and dates")
    void syncSelection() {
        ChannelMapping d = mapping(deluxe, "11", "ap");
        ChannelMapping s = mapping(suite, "22", "ap");
        when(mappingRepo.findByHotelIdAndActiveTrue(hotelId)).thenReturn(List.of(d, s));
        when(ariService.push(any(), any())).thenReturn(List.of(ChannelSyncLog.builder().status(SyncStatus.SUCCESS).build()));
        LocalDate from = LocalDate.now().plusDays(1), to = LocalDate.now().plusDays(7);

        service.sync(hotelId, new ChannelService.SyncCommand(EnumSet.of(SyncType.INVENTORY, SyncType.BOOKING),
            null, null, Set.of(suite), null, from, to), "user-1");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ChannelMapping>> pushed = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<AxisRoomsAriService.PushRequest> req = ArgumentCaptor.forClass(AxisRoomsAriService.PushRequest.class);
        verify(ariService).push(pushed.capture(), req.capture());
        assertThat(pushed.getValue()).containsExactly(s);
        assertThat(req.getValue().types()).containsExactly(SyncType.INVENTORY);   // BOOKING isn't pushable
        assertThat(req.getValue().from()).isEqualTo(from);
        assertThat(req.getValue().to()).isEqualTo(to);
        assertThat(req.getValue().trigger()).isEqualTo("MANUAL");
        assertThat(req.getValue().triggeredBy()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("sync with no matching mapping is rejected instead of silently doing nothing")
    void syncNothingMatches() {
        when(mappingRepo.findByHotelIdAndActiveTrue(hotelId)).thenReturn(List.of(mapping(deluxe, "11", "ap")));
        assertThatThrownBy(() -> service.sync(hotelId, new ChannelService.SyncCommand(null, null, null,
            Set.of(suite), null, null, null), "u")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(ariService);
    }

    @Test
    @DisplayName("an external room + rate plan already mapped on the same connection can't be mapped again")
    void duplicateMappingRejected() {
        when(mappingRepo.findByHotelId(hotelId)).thenReturn(List.of(mapping(deluxe, "11", "ap")));

        ChannelMapping again = mapping(suite, " 11 ", "ap");
        again.setId(null);
        assertThatThrownBy(() -> service.createMapping(again)).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("already mapped");

        ChannelMapping otherPlan = mapping(deluxe, "11", "cp");
        otherPlan.setId(null);
        when(mappingRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThat(service.createMapping(otherPlan).getExternalRatePlanId()).isEqualTo("cp");
    }

    @Test
    @DisplayName("live connection settings are rejected for providers without an adapter")
    void liveConnectionOnlyAllowedForAxisRooms() {
        ChannelMapping unsupported = mapping(deluxe, "11", "ap");
        unsupported.setChannel(ChannelName.BOOKING_COM);
        when(mappingRepo.findByHotelId(hotelId)).thenReturn(List.of());

        assertThatThrownBy(() -> service.createMapping(unsupported))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("only for AxisRooms");
        verify(mappingRepo, never()).save(any());
    }

    @Test
    @DisplayName("partial AxisRooms credentials and non-AxisRooms hosts are rejected")
    void invalidAxisRoomsConnectionRejected() {
        ChannelMapping partial = mapping(deluxe, "11", "ap");
        partial.setAccessKey("");
        assertThatThrownBy(() -> service.createMapping(partial))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("requires an access key");

        ChannelMapping unsafeHost = mapping(deluxe, "11", "ap");
        unsafeHost.setCmBaseUrl("http://127.0.0.1:8080");
        assertThatThrownBy(() -> service.createMapping(unsafeHost))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("HTTPS AxisRooms host");
        verify(mappingRepo, never()).save(any());
    }

    @Test
    @DisplayName("new room mappings reuse the saved connection key without returning it to the client")
    void newMappingReusesSavedConnectionKeyWhenOmitted() {
        ChannelMapping existing = mapping(deluxe, "11", "ap");
        ChannelMapping added = mapping(suite, "22", "ap");
        added.setAccessKey("");
        when(mappingRepo.findByHotelId(hotelId)).thenReturn(List.of(existing));
        when(mappingRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        ChannelMapping created = service.createMapping(added);

        assertThat(created.getAccessKey()).isEqualTo("k");
        assertThat(created.isHasAccessKey()).isTrue();
    }

    @Test
    @DisplayName("legacy live mappings for other providers are failed safely instead of sent AxisRooms payloads")
    void unsupportedProviderIsNotSentAxisRoomsPayloads() {
        ChannelMapping legacy = mapping(deluxe, "11", "ap");
        legacy.setChannel(ChannelName.BOOKING_COM);
        when(mappingRepo.findByHotelIdAndActiveTrue(hotelId)).thenReturn(List.of(legacy));
        when(syncLogRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        List<ChannelSyncLog> result = service.sync(hotelId,
            new ChannelService.SyncCommand(EnumSet.of(SyncType.INVENTORY), null, null, null, null, null, null), "u");

        verifyNoInteractions(ariService);
        assertThat(result).singleElement().satisfies(row -> {
            assertThat(row.getStatus()).isEqualTo(SyncStatus.FAILED);
            assertThat(row.getMessage()).contains("not available for BOOKING_COM");
        });
    }

    @Test
    @DisplayName("partial legacy AxisRooms configuration fails instead of showing a simulated success")
    void partialLegacyAxisRoomsConfigDoesNotSimulateSuccess() {
        ChannelMapping partial = mapping(deluxe, "11", "ap");
        partial.setChannelId("");
        when(mappingRepo.findByHotelIdAndActiveTrue(hotelId)).thenReturn(List.of(partial));
        when(syncLogRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        List<ChannelSyncLog> result = service.sync(hotelId,
            new ChannelService.SyncCommand(EnumSet.of(SyncType.INVENTORY), null, null, null, null, null, null), "u");

        verifyNoInteractions(ariService);
        assertThat(result).singleElement().satisfies(row -> {
            assertThat(row.getStatus()).isEqualTo(SyncStatus.FAILED);
            assertThat(row.getMessage()).contains("connection is incomplete");
        });
    }
}
