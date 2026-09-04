package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.Agent;
import in.aviqr.pms.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/agents")
    public ResponseEntity<ApiResponse<Agent>> create(
            @RequestBody Agent req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Agent created", agentService.create(req)));
    }

    @GetMapping("/api/v1/pms/agents/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Agent>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(agentService.listForHotel(hotelId)));
    }

    @PutMapping("/api/v1/pms/agents/{id}")
    public ResponseEntity<ApiResponse<Agent>> update(
            @PathVariable UUID id, @RequestBody Agent req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Agent existing = agentService.get(id);
        if (!hotelServiceClient.hasAccess(existing.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Updated", agentService.update(id, req)));
    }
}
