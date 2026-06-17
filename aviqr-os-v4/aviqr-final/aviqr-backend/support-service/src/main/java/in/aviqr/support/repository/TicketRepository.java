package in.aviqr.support.repository;
import in.aviqr.support.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<SupportTicket, UUID> {
    Page<SupportTicket> findByStatus(TicketStatus s, Pageable p);
    Page<SupportTicket> findByPriority(TicketPriority p, Pageable pg);
    Page<SupportTicket> findByUserId(String userId, Pageable pg);
    long countByStatus(TicketStatus s);
}