package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelInfoDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.NotificationClient;
import in.aviqr.pms.entity.GroupEnquiry;
import in.aviqr.pms.entity.ReservationGroup;
import in.aviqr.pms.repository.GroupEnquiryRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GroupEnquiryServiceTest {
    final GroupEnquiryRepository repo = mock(GroupEnquiryRepository.class);
    final GroupService groups = mock(GroupService.class);
    final HotelServiceClient hotels = mock(HotelServiceClient.class);
    final NotificationClient mail = mock(NotificationClient.class);
    final GroupEnquiryService service = new GroupEnquiryService(repo, groups, hotels, mail);
    final UUID hotel = UUID.randomUUID();

    GroupEnquiry.GroupEnquiryBuilder req() {
        return GroupEnquiry.builder().organizerName("  Priya Shah ").organizerPhone("+91 98765 43210").organizerEmail("priya@example.com")
            .eventType("wedding").checkInDate(LocalDate.now().plusDays(60)).checkOutDate(LocalDate.now().plusDays(62)).rooms(25).guests(60);
    }

    @Test
    void savesAndEmailsBothSides() {
        when(repo.save(any())).thenAnswer(i -> { GroupEnquiry e = i.getArgument(0); e.setId(UUID.randomUUID()); return e; });
        HotelInfoDto info = new HotelInfoDto();
        info.setId(hotel); info.setName("Leela"); info.setEmail("sales@leela.example");
        when(hotels.getAllActiveHotels()).thenReturn(List.of(info));
        GroupEnquiry saved = service.submit(hotel, req().build());
        assertThat(saved.getOrganizerName()).isEqualTo("Priya Shah");
        assertThat(saved.getEventType()).isEqualTo("WEDDING");
        assertThat(saved.getStatus()).isEqualTo("NEW");
        verify(mail, timeout(2000)).sendEmail(eq("sales@leela.example"), contains("25 rooms"), anyString());
        verify(mail, timeout(2000)).sendEmail(eq("priya@example.com"), contains("Leela"), anyString());
    }

    @Test
    void validatesTheRequest() {
        assertThatThrownBy(() -> service.submit(hotel, req().organizerPhone("abc").build())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.submit(hotel, req().checkInDate(LocalDate.now().minusDays(1)).build())).hasMessageContaining("dates");
        assertThatThrownBy(() -> service.submit(hotel, req().rooms(0).build())).hasMessageContaining("Rooms");
        assertThatThrownBy(() -> service.submit(hotel, req().organizerEmail("nope").build())).hasMessageContaining("email");
        verify(repo, never()).save(any());
    }

    @Test
    void convertsOnce() {
        GroupEnquiry e = req().id(UUID.randomUUID()).hotelId(hotel).company("Shah Family").eventType("WEDDING").message("Mehendi on day one").build();
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(groups.create(any(), eq("staff-1"))).thenAnswer(i -> { ReservationGroup g = i.getArgument(0); g.setId(UUID.randomUUID()); return g; });
        GroupEnquiry won = service.convert(e, "staff-1");
        ArgumentCaptor<ReservationGroup> g = ArgumentCaptor.forClass(ReservationGroup.class);
        verify(groups).create(g.capture(), eq("staff-1"));
        assertThat(g.getValue().getName()).isEqualTo("Shah Family · Wedding");
        assertThat(g.getValue().getNotes()).contains("25 rooms").contains("Mehendi");
        assertThat(won.getStatus()).isEqualTo("WON");
        service.convert(won, "staff-1");
        verify(groups, times(1)).create(any(), any());
    }
}
