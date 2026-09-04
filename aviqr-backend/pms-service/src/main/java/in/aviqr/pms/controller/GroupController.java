package in.aviqr.pms.controller;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.entity.FolioPayment;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationGroup;
import in.aviqr.pms.service.GroupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final HotelServiceClient hotelServiceClient;

    @PostMapping("/api/v1/pms/groups")
    public ResponseEntity<ApiResponse<ReservationGroup>> create(
            @RequestBody ReservationGroup req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Group created", groupService.create(req, uid)));
    }

    @GetMapping("/api/v1/pms/groups/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<ReservationGroup>>> listForHotel(
            @PathVariable UUID hotelId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!hotelServiceClient.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(groupService.listForHotel(hotelId)));
    }

    @GetMapping("/api/v1/pms/groups/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> get(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ReservationGroup group = groupService.get(id);
        if (!hotelServiceClient.hasAccess(group.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<Reservation> members = groupService.members(id);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("group", group, "members", members)));
    }

    @PostMapping("/api/v1/pms/groups/{id}/check-in")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkInAll(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ReservationGroup group = groupService.get(id);
        if (!hotelServiceClient.hasAccess(group.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Group check-in complete", groupService.checkInAll(id)));
    }

    @PostMapping("/api/v1/pms/groups/{id}/check-out")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkOutAll(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ReservationGroup group = groupService.get(id);
        if (!hotelServiceClient.hasAccess(group.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Group check-out complete", groupService.checkOutAll(id)));
    }

    @GetMapping("/api/v1/pms/groups/{id}/folio")
    public ResponseEntity<ApiResponse<Map<String, Object>>> groupFolio(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ReservationGroup group = groupService.get(id);
        if (!hotelServiceClient.hasAccess(group.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(groupService.groupFolio(id)));
    }

    @PostMapping("/api/v1/pms/groups/{id}/folio/payments")
    public ResponseEntity<ApiResponse<FolioPayment>> addGroupPayment(
            @PathVariable UUID id, @RequestBody FolioPayment req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        ReservationGroup group = groupService.get(id);
        if (!hotelServiceClient.hasAccess(group.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Payment recorded",
            groupService.addGroupPayment(id, req.getMethod(), req.getAmount(), req.getReference(), uid)));
    }
}
