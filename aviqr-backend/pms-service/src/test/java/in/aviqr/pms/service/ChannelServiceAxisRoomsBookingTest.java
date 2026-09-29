package in.aviqr.pms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.dto.AcceptBookingRequest;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ChannelBookingRepository;
import in.aviqr.pms.repository.ChannelMappingRepository;
import in.aviqr.pms.repository.ChannelSyncLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ChannelServiceAxisRoomsBookingTest {

    @Mock ChannelMappingRepository mappingRepo;
    @Mock ChannelBookingRepository channelBookingRepo;
    @Mock ChannelSyncLogRepository syncLogRepo;
    @Mock ReservationService reservationService;
    @Mock AvailabilityService availabilityService;
    @Mock AxisRoomsAriService ariService;
    @Spy ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks ChannelService service;

    private final UUID hotelId = UUID.randomUUID();
    private final UUID roomTypeId = UUID.randomUUID();
    private final UUID ratePlanId = UUID.randomUUID();

    // The shape AxisRooms' GenericPMSPushBookingModel serializes, trimmed to what we read.
    private static final String CONFIRMED = """
        {
          "accessKey": "key-123",
          "GuestDetails": {"title": "Mr", "guestName": "Ravi Kumar", "emailId": "ravi@example.com", "mobileNo": "+919800000000"},
          "CheckinDetails": {"checkInDate": "2026-10-10", "checkOutDate": "2026-10-12", "totalPax": "3", "adult": "2",
                             "children": "1", "totalAmount": "12000", "paid": "0", "currency": "INR",
                             "specialRequest": ["Late check-in"]},
          "BookingDetails": {"hotelId": "AX-HOTEL-1", "bookingNo": "BDC-555", "ota": "Booking.com", "otaRefId": "19",
                             "bookingStatus": "confirmed", "creditCardToken": "tok_x", "cardNumber": "4111"},
          "Rates": {"roomType": [{"id": "AX-ROOM-1", "ratePlanId": "AX-RP-1", "noOfRooms": "2",
                                   "dayWiseDetails": [{"date": "2026-10-10", "rate": "6000"}, {"date": "2026-10-11", "rate": "6000"}]}]}
        }""";

    @BeforeEach
    void setUp() {
        ChannelMapping mapping = ChannelMapping.builder().id(UUID.randomUUID()).hotelId(hotelId).roomTypeId(roomTypeId)
            .channel(ChannelName.AXISROOMS).externalPropertyId("AX-HOTEL-1").externalRoomTypeId("AX-ROOM-1")
            .externalRatePlanId("AX-RP-1").internalRatePlanId(ratePlanId).accessKey("key-123").active(true)
            .webhookSecret("s").build();
        when(mappingRepo.findByAccessKeyAndExternalPropertyIdAndActiveTrue("key-123", "AX-HOTEL-1")).thenReturn(List.of(mapping));
        when(reservationService.createFromChannel(any(), any(), any(), any(), any(), anyInt(), anyInt(), any(), any()))
            .thenAnswer(inv -> Reservation.builder().id(UUID.randomUUID()).hotelId(hotelId)
                .checkInDate(inv.getArgument(3)).checkOutDate(inv.getArgument(4)).build());
    }

    private AcceptBookingRequest request(String status) throws Exception {
        AcceptBookingRequest req = new ObjectMapper().readValue(CONFIRMED, AcceptBookingRequest.class);
        req.getBookingDetails().setBookingStatus(status);
        return req;
    }

    @Test
    @DisplayName("confirmed booking creates a reservation per room with the per-room-night rate")
    void confirmedCreates() throws Exception {
        when(channelBookingRepo.findByChannelAndExternalBookingId(ChannelName.AXISROOMS, "19:BDC-555")).thenReturn(Optional.empty());

        service.ingestBookingReal(request("confirmed"));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ReservationService.ChannelRoomLine>> lines = ArgumentCaptor.forClass(List.class);
        verify(reservationService).createFromChannel(eq(hotelId), eq("Ravi Kumar"), eq("+919800000000"),
            eq(LocalDate.of(2026, 10, 10)), eq(LocalDate.of(2026, 10, 12)), eq(2), eq(1),
            argThat(n -> n.contains("Booking.com booking BDC-555") && n.contains("Late check-in")), lines.capture());
        assertThat(lines.getValue()).hasSize(2);
        // 12000 across 2 rooms × 2 nights
        assertThat(lines.getValue()).allSatisfy(l -> {
            assertThat(l.roomTypeId()).isEqualTo(roomTypeId);
            assertThat(l.ratePlanId()).isEqualTo(ratePlanId);
            assertThat(l.ratePerNight()).isEqualByComparingTo(new BigDecimal("3000.00"));
        });
        verify(channelBookingRepo).save(argThat(b -> b.getExternalBookingId().equals("19:BDC-555")
            && b.getChannel() == ChannelName.AXISROOMS));
    }

    @Test
    @DisplayName("a repeated confirmed push returns the existing reservation")
    void duplicateIsIdempotent() throws Exception {
        UUID existingId = UUID.randomUUID();
        when(channelBookingRepo.findByChannelAndExternalBookingId(ChannelName.AXISROOMS, "19:BDC-555"))
            .thenReturn(Optional.of(ChannelBooking.builder().reservationId(existingId).build()));
        when(reservationService.get(existingId)).thenReturn(Reservation.builder().id(existingId).build());

        assertThat(service.ingestBookingReal(request("confirmed")).getId()).isEqualTo(existingId);
        verify(reservationService, never()).createFromChannel(any(), any(), any(), any(), any(), anyInt(), anyInt(), any(), any());
    }

    @Test
    @DisplayName("modified supersedes the old reservation and re-points the booking link")
    void modifiedReplaces() throws Exception {
        UUID oldId = UUID.randomUUID();
        ChannelBooking link = ChannelBooking.builder().channel(ChannelName.AXISROOMS).externalBookingId("19:BDC-555").reservationId(oldId).build();
        when(channelBookingRepo.findByChannelAndExternalBookingId(ChannelName.AXISROOMS, "19:BDC-555")).thenReturn(Optional.of(link));

        Reservation created = service.ingestBookingReal(request("modified"));

        InOrder order = inOrder(reservationService);
        order.verify(reservationService).supersede(oldId);
        order.verify(reservationService).createFromChannel(any(), any(), any(), any(), any(), anyInt(), anyInt(), any(), any());
        assertThat(link.getReservationId()).isEqualTo(created.getId());
        verify(channelBookingRepo).save(link);
    }

    @Test
    @DisplayName("cancelled cancels once; a repeated cancel is a no-op")
    void cancelled() throws Exception {
        UUID id = UUID.randomUUID();
        when(channelBookingRepo.findByChannelAndExternalBookingId(ChannelName.AXISROOMS, "19:BDC-555"))
            .thenReturn(Optional.of(ChannelBooking.builder().reservationId(id).build()));
        when(reservationService.get(id)).thenReturn(Reservation.builder().id(id).status(ReservationStatus.BOOKED).build());
        when(reservationService.cancel(id)).thenReturn(Reservation.builder().id(id).status(ReservationStatus.CANCELLED).build());

        service.ingestBookingReal(request("cancelled"));
        verify(reservationService).cancel(id);

        when(reservationService.get(id)).thenReturn(Reservation.builder().id(id).status(ReservationStatus.CANCELLED).build());
        service.ingestBookingReal(request("cancelled"));
        verify(reservationService, times(1)).cancel(id);
    }

    @Test
    @DisplayName("an unknown accessKey/hotelId is rejected before anything else")
    void rejectsUnknownKey() throws Exception {
        AcceptBookingRequest req = request("confirmed");
        req.setAccessKey("wrong");
        assertThatThrownBy(() -> service.ingestBookingReal(req)).isInstanceOf(ChannelService.ChannelAuthException.class);
        verifyNoInteractions(reservationService);
    }
}
