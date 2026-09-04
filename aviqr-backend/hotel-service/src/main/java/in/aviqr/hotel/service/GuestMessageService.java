package in.aviqr.hotel.service;

import in.aviqr.hotel.entity.GuestMessage;
import in.aviqr.hotel.entity.MessageSender;
import in.aviqr.hotel.repository.GuestMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class GuestMessageService {

    private final GuestMessageRepository repo;

    public GuestMessage send(UUID hotelId, String roomNumber, String guestName, MessageSender sender, String message) {
        return repo.save(GuestMessage.builder()
            .hotelId(hotelId).roomNumber(roomNumber).guestName(guestName)
            .sender(sender).message(message).build());
    }

    public List<GuestMessage> thread(UUID hotelId, String roomNumber) {
        return repo.findByHotelIdAndRoomNumberOrderByCreatedAtAsc(hotelId, roomNumber);
    }

    public List<GuestMessage> inbox(UUID hotelId) {
        return repo.latestPerRoom(hotelId);
    }

    /** Called when staff opens a room's thread — clears its unread-from-guest badge. */
    public void markThreadRead(UUID hotelId, String roomNumber) {
        List<GuestMessage> unread = repo.findByHotelIdAndRoomNumberOrderByCreatedAtAsc(hotelId, roomNumber).stream()
            .filter(m -> m.getSender() == MessageSender.GUEST && !Boolean.TRUE.equals(m.getReadByStaff()))
            .toList();
        unread.forEach(m -> m.setReadByStaff(true));
        repo.saveAll(unread);
    }
}
