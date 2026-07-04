package in.aviqr.notification.controller;
import in.aviqr.notification.dto.ApiResponse;
import in.aviqr.notification.entity.Notification;
import in.aviqr.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/v1/notifications") @RequiredArgsConstructor
public class NotificationController {
    private final NotificationRepository repo;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Notification>>> get(@RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok(repo.findByUserIdOrderByCreatedAtDesc(uid)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Long>> unreadCount(@RequestHeader("X-User-Id") String uid) {
        return ResponseEntity.ok(ApiResponse.ok(repo.countByUserIdAndReadFalse(uid)));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable String id) {
        repo.findById(id).ifPresent(n -> { n.setRead(true); repo.save(n); });
        return ResponseEntity.ok(ApiResponse.ok("Marked read", null));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<Notification>> send(@RequestBody Map<String,String> body) {
        Notification n = Notification.builder()
            .userId(body.get("userId")).title(body.get("title")).body(body.get("body"))
            .type(body.get("type")).shopId(body.get("shopId")).orderId(body.get("orderId"))
            .createdAt(LocalDateTime.now()).build();
        return ResponseEntity.ok(ApiResponse.ok("Sent", repo.save(n)));
    }
}