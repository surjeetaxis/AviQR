package in.aviqr.support.controller;
import in.aviqr.support.dto.ApiResponse;
import in.aviqr.support.entity.*;
import in.aviqr.support.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor
public class SupportController {
    private final TicketRepository ticketRepo;
    private final ImpersonationLogRepository impersonationRepo;

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
            @RequestParam(defaultValue="20") int size) {
        Pageable pg = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<SupportTicket> result;
        if (status != null) result = ticketRepo.findByStatus(TicketStatus.valueOf(status.toUpperCase()), pg);
        else if (priority != null) result = ticketRepo.findByPriority(TicketPriority.valueOf(priority.toUpperCase()), pg);
        else result = ticketRepo.findAll(pg);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/api/v1/tickets/{id}")
    public ResponseEntity<ApiResponse<SupportTicket>> getTicket(@PathVariable UUID id) {
        return ticketRepo.findById(id).map(t -> ResponseEntity.ok(ApiResponse.ok(t))).orElse(ResponseEntity.notFound().build());
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
    public ResponseEntity<ApiResponse<Map<String,Long>>> stats() {
        Map<String,Long> m = new LinkedHashMap<>();
        for (TicketStatus s : TicketStatus.values()) m.put(s.name().toLowerCase(), ticketRepo.countByStatus(s));
        return ResponseEntity.ok(ApiResponse.ok(m));
    }

    // ── Impersonation ─────────────────────────────────────────────────────────
    @PostMapping("/api/v1/support/impersonate")
    public ResponseEntity<ApiResponse<ImpersonationLog>> startImpersonation(
            @RequestBody Map<String,String> body,
            @RequestHeader("X-User-Id") String agentId,
            @RequestHeader("X-User-Role") String role) {
        if (!"SUPPORT".equals(role) && !"ADMIN".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        ImpersonationLog log = ImpersonationLog.builder()
            .agentId(agentId)
            .agentName(body.getOrDefault("agentName", ""))
            .targetUserId(body.get("targetUserId"))
            .targetUserName(body.getOrDefault("targetUserName", ""))
            .reason(body.get("reason"))
            .build();
        return ResponseEntity.ok(ApiResponse.ok("Impersonation session started", impersonationRepo.save(log)));
    }

    @GetMapping("/api/v1/support/impersonation-logs")
    public ResponseEntity<ApiResponse<Page<ImpersonationLog>>> impersonationLogs(
            @RequestHeader("X-User-Id") String agentId,
            @RequestParam(defaultValue="0") int page) {
        return ResponseEntity.ok(ApiResponse.ok(
            impersonationRepo.findByAgentIdOrderByCreatedAtDesc(agentId, PageRequest.of(page, 20))));
    }
}