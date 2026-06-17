package in.aviqr.notification.repository;
import in.aviqr.notification.entity.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    long countByUserIdAndReadFalse(String userId);
    List<Notification> findByShopIdOrderByCreatedAtDesc(String shopId);
}