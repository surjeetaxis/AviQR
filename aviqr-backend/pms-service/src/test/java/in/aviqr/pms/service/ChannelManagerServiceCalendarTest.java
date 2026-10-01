package in.aviqr.pms.service;

import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChannelManagerServiceCalendarTest {

    @Mock ChannelMappingRepository mappingRepo;
    @Mock ChannelSyncLogRepository syncLogRepo;
    @Mock ChannelBookingRepository channelBookingRepo;
    @Mock RoomTypeRepository roomTypeRepo;
    @Mock RatePlanRepository ratePlanRepo;
    @Mock DayPriceRepository dayPriceRepo;
    @Mock RoomTypeInventoryRepository inventoryRepo;
    @Mock RoomReservationRepository roomReservationRepo;
    @Mock ReservationRepository reservationRepo;
    @Mock RateChangeLogRepository rateChangeLogRepo;
    @Mock AvailabilityService availabilityService;
    @InjectMocks ChannelManagerService service;

    private final UUID hotelId = UUID.randomUUID();
    private final LocalDate today = LocalDate.now();
    private final LocalDateTime lastSync = LocalDateTime.now().minusHours(2);
    private RoomType deluxe;
    private RatePlan plan;

    @BeforeEach
    void setUp() {
        deluxe = RoomType.builder().id(UUID.randomUUID()).hotelId(hotelId).name("Deluxe").maxOccupancy(2).build();
        plan = RatePlan.builder().id(UUID.randomUUID()).hotelId(hotelId).roomTypeId(deluxe.getId()).name("Room Only")
            .baseRate(new BigDecimal("3000")).build();
        when(roomTypeRepo.findByHotelIdAndActiveTrue(hotelId)).thenReturn(List.of(deluxe));
        when(ratePlanRepo.findByRoomTypeIdAndActiveTrue(deluxe.getId())).thenReturn(List.of(plan));
        when(mappingRepo.findByHotelIdAndActiveTrue(hotelId)).thenReturn(List.of(ChannelMapping.builder()
            .id(UUID.randomUUID()).hotelId(hotelId).roomTypeId(deluxe.getId()).channel(ChannelName.AXISROOMS)
            .externalPropertyId("12").externalRoomTypeId("11").externalRatePlanId("ap").internalRatePlanId(plan.getId())
            .active(true).webhookSecret("s").build()));
        Map<LocalDate, Integer> sellable = new LinkedHashMap<>();
        for (int i = 0; i < 5; i++) sellable.put(today.plusDays(i), 2);
        when(availabilityService.availabilityCalendar(eq(hotelId), eq(deluxe.getId()), any(), any())).thenReturn(sellable);
        String rt = deluxe.getId().toString();
        when(syncLogRepo.findTop500ByHotelIdAndDirectionOrderByCreatedAtDesc(hotelId, SyncDirection.PUSH)).thenReturn(List.of(
            syncRow(SyncType.INVENTORY, SyncStatus.SUCCESS, rt),
            syncRow(SyncType.RATES, SyncStatus.SUCCESS, rt),
            syncRow(SyncType.RESTRICTIONS, SyncStatus.SKIPPED, rt)));
        when(rateChangeLogRepo.findByHotelIdAndChangedAtAfterAndDateBetween(eq(hotelId), any(), any(), any())).thenReturn(List.of(
            RateChangeLog.builder().hotelId(hotelId).roomTypeId(deluxe.getId()).ratePlanId(plan.getId())
                .date(today.plusDays(3)).field("price").newValue("3500").changedBy("u").changedAt(LocalDateTime.now()).build(),
            RateChangeLog.builder().hotelId(hotelId).roomTypeId(deluxe.getId()).ratePlanId(plan.getId())
                .date(today.plusDays(4)).field("stopSell").newValue("true").changedBy("u").changedAt(lastSync.minusHours(1)).build()));
        Reservation ota = Reservation.builder().id(UUID.randomUUID()).hotelId(hotelId).checkInDate(today.plusDays(1))
            .checkOutDate(today.plusDays(3)).status(ReservationStatus.BOOKED).source(ReservationSource.OTA)
            .createdAt(LocalDateTime.now()).build();
        when(reservationRepo.findByHotelIdOverlapping(eq(hotelId), any(), any())).thenReturn(List.of(ota));
        when(roomReservationRepo.findByReservationIdIn(any())).thenReturn(List.of(
            RoomReservation.builder().reservationId(ota.getId()).roomTypeId(deluxe.getId()).build()));
    }

    private ChannelSyncLog syncRow(SyncType type, SyncStatus status, String roomTypeIds) {
        return ChannelSyncLog.builder().hotelId(hotelId).channel(ChannelName.AXISROOMS).direction(SyncDirection.PUSH)
            .syncType(type).status(status).roomTypeIds(roomTypeIds).externalPropertyId("12").createdAt(lastSync).build();
    }

    @Test
    @DisplayName("calendar counts OTA stays and flags only what changed after the last sync")
    void pendingAndCounts() {
        var cal = service.calendar(hotelId, today, today.plusDays(5), null, null);
        var row = cal.roomTypes().get(0);
        assertThat(row.mapped()).isTrue();
        assertThat(row.externalRoomTypeIds()).containsExactly("11");
        assertThat(row.lastSync().get(SyncType.RESTRICTIONS).status()).isEqualTo(SyncStatus.SKIPPED);

        var days = row.days();
        assertThat(days.get(0).pending()).isFalse();
        assertThat(days.get(1).booked()).isEqualTo(1);
        assertThat(days.get(1).channelStays()).isEqualTo(1);
        assertThat(days.get(1).channelArrivals()).isEqualTo(1);
        assertThat(days.get(1).pending()).isTrue();     // booking made after the last inventory sync
        assertThat(days.get(2).pending()).isTrue();
        assertThat(days.get(3).pending()).isFalse();    // checkout day isn't a stay night

        var rates = row.ratePlans().get(0);
        assertThat(rates.externalRatePlanIds()).containsExactly("ap");
        assertThat(rates.days().get(3).pricePending()).isTrue();
        assertThat(rates.days().get(2).pricePending()).isFalse();
        assertThat(rates.days().get(4).restrictionPending()).isFalse(); // changed before the last restriction sync
    }

    @Test
    @DisplayName("a mapped room type that has never synced shows every future date pending")
    void neverSynced() {
        when(syncLogRepo.findTop500ByHotelIdAndDirectionOrderByCreatedAtDesc(hotelId, SyncDirection.PUSH)).thenReturn(List.of());
        var row = service.calendar(hotelId, today, today.plusDays(5), null, null).roomTypes().get(0);
        assertThat(row.days()).allMatch(ChannelManagerService.InventoryDay::pending);
        assertThat(row.ratePlans().get(0).days()).allMatch(d -> d.pricePending() && d.restrictionPending());
    }

    @Test
    @DisplayName("calendar windows are limited to 62 days")
    void windowLimit() {
        assertThatThrownBy(() -> service.calendar(hotelId, today, today.plusDays(90), null, null))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
