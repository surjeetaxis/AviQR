package in.aviqr.support.controller;
import in.aviqr.support.client.AuthInternalClient;
import in.aviqr.support.dto.ApiResponse;
import in.aviqr.support.dto.ImpersonationTokenResponse;
import in.aviqr.support.entity.*;
import in.aviqr.support.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class SupportController {
    private final TicketRepository ticketRepo;
    private final ImpersonationLogRepository impersonationRepo;
    private final AuthInternalClient authInternalClient;

    // ── Tickets ───────────────────────────────────────────────────────────────
    @PostMapping("/api/v1/tickets")
    public ResponseEntity<ApiResponse<SupportTicket>> createTicket(
            @RequestBody SupportTicket ticket,
            @RequestHeader("X-User-Id") String uid) {
        ticket.setUserId(uid);
        ticket.setTicketNumber("TKT-" + (System.currentTimeMillis() % 100000));
        return ResponseEntity.ok(ApiResponse.ok("Ticket created", ticketRepo.save(ticket)));
    }

    @GetMapping("/api/v1/tickets")
    public ResponseEntity<ApiResponse<Page<SupportTicket>>> listTickets(
            @RequestParam(required=false) String status,
            @RequestParam(required=false) String priority,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"SUPPORT".equals(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SupportTicket> result;
        if (status != null) result = ticketRepo.findByStatus(TicketStatus.valueOf(status.toUpperCase()), pg);
        else if (priority != null) result = ticketRepo.findByPriority(TicketPriority.valueOf(priority.toUpperCase()), pg);
        else result = ticketRepo.findAll(pg);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/api/v1/tickets/{id}")
    public ResponseEntity<ApiResponse<SupportTicket>> getTicket(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return ticketRepo.findById(id).map(t -> {
            boolean isOwn = uid.equals(t.getUserId());
            boolean isStaff = "SUPPORT".equals(role) || "ADMIN".equals(role);
            if (!isOwn && !isStaff)
                return ResponseEntity.status(403).<ApiResponse<SupportTicket>>body(ApiResponse.error("Forbidden"));
            return ResponseEntity.ok(ApiResponse.ok(t));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/tickets/{id}/status")
    public ResponseEntity<ApiResponse<SupportTicket>> updateStatus(
            @PathVariable UUID id, @RequestParam String status, @RequestParam(required=false) String resolution) {
        return ticketRepo.findById(id).map(t -> {
            t.setStatus(TicketStatus.valueOf(status.toUpperCase()));
            if (resolution != null) t.setResolution(resolution);
            if (status.equalsIgnoreCase("RESOLVED")) t.setResolvedAt(LocalDateTime.now());
            return ResponseEntity.ok(ApiResponse.ok("Updated", ticketRepo.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/tickets/{id}/assign")
    public ResponseEntity<ApiResponse<SupportTicket>> assign(@PathVariable UUID id, @RequestParam String agentId) {
        return ticketRepo.findById(id).map(t -> {
            t.setAssignedTo(agentId);
            return ResponseEntity.ok(ApiResponse.ok("Assigned", ticketRepo.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/v1/tickets/stats")
    public ResponseEntity<ApiResponse<Map<String,Long>>> stats(
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!"SUPPORT".equals(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String,Long> m = new LinkedHashMap<>();
        for (TicketStatus s : TicketStatus.values()) m.put(s.name().toLowerCase(), ticketRepo.countByStatus(s));
        return ResponseEntity.ok(ApiResponse.ok(m));
    }

    // ── Impersonation ─────────────────────────────────────────────────────────
    // Real "log in as this customer": mints an actual short-lived access token via
    // auth-service (previously this only wrote a log row with no functional effect).
    @PostMapping("/api/v1/support/impersonate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> startImpersonation(
            @RequestBody Map<String,String> body,
            @RequestHeader("X-User-Id") String agentId,
            @RequestHeader("X-User-Role") String role) {
        if (!"SUPPORT".equals(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String targetUserId = body.get("targetUserId");
        if (targetUserId == null || targetUserId.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("targetUserId is required"));

        ImpersonationTokenResponse tokenResp;
        try {
            tokenResp = authInternalClient.mintImpersonationToken(targetUserId, agentId, role);
        } catch (Exception e) {
            log.warn("Failed to mint impersonation token for user {}: {}", targetUserId, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not start impersonation session"));
        }

        ImpersonationLog entry = impersonationRepo.save(ImpersonationLog.builder()
            .agentId(agentId)
            .agentName(body.getOrDefault("agentName", ""))
            .targetUserId(targetUserId)
            .targetUserName(tokenResp.getTargetUserName() != null ? tokenResp.getTargetUserName() : body.getOrDefault("targetUserName", ""))
            .reason(body.get("reason"))
            .sessionId(tokenResp.getSessionId())
            .build());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("impersonationLogId", entry.getId());
        response.put("accessToken", tokenResp.getAccessToken());
        response.put("expiresIn", tokenResp.getExpiresIn());
        response.put("targetUserId", entry.getTargetUserId());
        response.put("targetUserName", entry.getTargetUserName());
        response.put("targetUserRole", tokenResp.getTargetUserRole());
        return ResponseEntity.ok(ApiResponse.ok("Impersonation session started", response));
    }

    // Ends an impersonation session: marks the log and revokes the minted session
    // on auth-service so the token stops working immediately rather than just expiring.
    @PostMapping("/api/v1/support/impersonate/{logId}/end")
    public ResponseEntity<ApiResponse<Void>> endImpersonation(
            @PathVariable UUID logId,
            @RequestHeader("X-User-Id") String agentId,
            @RequestHeader("X-User-Role") String role) {
        if (!"SUPPORT".equals(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        return impersonationRepo.findById(logId).map(entry -> {
            if (!agentId.equals(entry.getAgentId()) && !"ADMIN".equals(role))
                return ResponseEntity.status(403).<ApiResponse<Void>>body(ApiResponse.error("Forbidden"));

            entry.setEndedAt(LocalDateTime.now());
            impersonationRepo.save(entry);

            if (entry.getSessionId() != null)
                authInternalClient.revokeSession(entry.getTargetUserId(), entry.getSessionId(), agentId, role);

            return ResponseEntity.ok(ApiResponse.ok("Impersonation ended", (Void) null));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/v1/support/impersonation-logs")
    public ResponseEntity<ApiResponse<Page<ImpersonationLog>>> impersonationLogs(
            @RequestHeader("X-User-Id") String agentId,
            @RequestParam(defaultValue="0") int page) {
        return ResponseEntity.ok(ApiResponse.ok(
            impersonationRepo.findByAgentIdOrderByCreatedAtDesc(agentId, PageRequest.of(page, 20))));
    }
}