package in.aviqr.hotel.controller;

import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * STAFF-facing operations for guest service requests and outlet bookings.
 * Used by the hotel dashboard. All endpoints check hotel access.
 */
@RestController
@RequestMapping("/api/v1/hotel")
@RequiredArgsConstructor
public class HotelServiceOpsController {

    private final GuestServiceRequestRepository requestRepo;
    private final OutletBookingRepository bookingRepo;
    private final HotelAccessService accessService;

    // ── Service requests ────────────────────────────────────────────────────────
    @GetMapping("/{hotelId}/service-requests")
    public ResponseEntity<ApiResponse<List<GuestServiceRequest>>> listRequests(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<GuestServiceRequest> list = (status != null)
            ? requestRepo.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, RequestStatus.valueOf(status.toUpperCase()))
            : requestRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PutMapping("/service-requests/{id}/status")
    public ResponseEntity<ApiResponse<GuestServiceRequest>> updateRequestStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        GuestServiceRequest req = requestRepo.findById(id).orElse(null);
        if (req == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(req.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        RequestStatus ns = RequestStatus.valueOf(status.toUpperCase());
        req.setStatus(ns);
        if (ns == RequestStatus.DONE) req.setCompletedAt(LocalDateTime.now());
        if (req.getAssignedTo() == null) req.setAssignedTo(uid);
        return ResponseEntity.ok(ApiResponse.ok(requestRepo.save(req)));
    }

    // ── Outlet bookings ─────────────────────────────────────────────────────────
    @GetMapping("/{hotelId}/bookings")
    public ResponseEntity<ApiResponse<List<OutletBooking>>> listBookings(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<OutletBooking> list = (status != null)
            ? bookingRepo.findByHotelIdAndStatusOrderByCreatedAtDesc(hotelId, BookingStatus.valueOf(status.toUpperCase()))
            : bookingRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @PutMapping("/bookings/{id}/status")
    public ResponseEntity<ApiResponse<OutletBooking>> updateBookingStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        OutletBooking b = bookingRepo.findById(id).orElse(null);
        if (b == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(b.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        BookingStatus ns = BookingStatus.valueOf(status.toUpperCase());
        b.setStatus(ns);
        if (ns == BookingStatus.CONFIRMED) b.setConfirmedAt(LocalDateTime.now());
        return ResponseEntity.ok(ApiResponse.ok(bookingRepo.save(b)));
    }
}
