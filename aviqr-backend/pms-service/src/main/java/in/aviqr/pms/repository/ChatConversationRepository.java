package in.aviqr.pms.repository;

import in.aviqr.pms.entity.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, UUID> {
    Optional<ChatConversation> findByHotelIdAndContact(UUID hotelId, String contact);
}
