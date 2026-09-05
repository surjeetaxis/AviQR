package in.aviqr.hotel.controller;
import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.*;
import in.aviqr.hotel.repository.*;
import in.aviqr.hotel.service.HotelAccessService;
import in.aviqr.hotel.service.HousekeepingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequiredArgsConstructor @Slf4j
public class HotelController {
    private final HotelRepository hotelRepo;
    private final RoomRepository roomRepo;
    private final RoomRequestRepository reqRepo;
    private final HotelAccessRepository accessRepo;
    private final HotelAccessService accessService;
    private final HousekeepingService housekeepingService;
    private final RabbitTemplate rabbit;
    private final RestTemplate restTemplate;

    @Value("${qr.service.url:http://order-qr-service}")
    private String qrServiceUrl;

    // ── Admin: list all hotels ────────────────────────────────────────────────
    @GetMapping("/api/v1/hotels/admin/all")
    public ResponseEntity<ApiResponse<Page<Hotel>>> adminAllHotels(
            @RequestHeader(value="X-User-Role", defaultValue="") String role,
            @RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size) {
        if (!"ADMIN".equals(role) && !"SUPPORT".equals(role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(
            hotelRepo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    // ── Hotel CRUD ───────────────────────────────────────────────────────────
    @PostMapping("/api/v1/hotels")
    public ResponseEntity<ApiResponse<Hotel>> createHotel(@RequestBody Hotel hotel,
                                                           @RequestHeader("X-User-Id") String uid) {
        hotel.setOwnerId(uid);
        Hotel saved = hotelRepo.save(hotel);
        accessRepo.save(HotelAccess.builder().hotelId(saved.getId()).userId(uid).role(HotelRole.OWNER).build());
        return ResponseEntity.ok(ApiResponse.ok("Created", saved));
    }

    @GetMapping("/api/v1/hotels/my")
    public ResponseEntity<ApiResponse<List<Hotel>>> myHotels(@RequestHeader("X-User-Id") String uid) {
        List<UUID> hotelIds = accessRepo.findByUserId(uid).stream().map(HotelAccess::getHotelId).distinct().toList();
        List<Hotel> hotels = new ArrayList<>(hotelRepo.findAllById(hotelIds));
        hotelRepo.findByOwnerId(uid).forEach(h -> { if (hotels.stream().noneMatch(x -> x.getId().equals(h.getId()))) hotels.add(h); });
        return ResponseEntity.ok(ApiResponse.ok(hotels));
    }

    @GetMapping("/api/v1/hotels/{id}")
    public ResponseEntity<ApiResponse<Hotel>> getHotel(@PathVariable UUID id) {
        return hotelRepo.findById(id).map(h -> ResponseEntity.ok(ApiResponse.ok(h)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/api/v1/hotels/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Hotel>> updateHotel(
            @PathVariable UUID id, @RequestBody Hotel req,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return hotelRepo.findById(id).map(h -> {
            if (!accessService.hasAccess(id, uid, role))
                return ResponseEntity.status(403).<ApiResponse<Hotel>>body(ApiResponse.error("Forbidden"));
            h.setName(req.getName()); h.setPhone(req.getPhone()); h.setEmail(req.getEmail()); h.setAddress(req.getAddress());
            h.setLatitude(req.getLatitude()); h.setLongitude(req.getLongitude());
            h.setCheckInTime(req.getCheckInTime()); h.setCheckOutTime(req.getCheckOutTime());
            // Mutate the existing managed collection in place rather than replacing the
            // List reference — this method wasn't @Transactional before, so `h` was
            // detached by the time save() ran, and Hibernate's merge of a replaced
            // @ElementCollection reference silently failed to delete the old rows,
            // leaving hotel_enabled_services accumulating a duplicate row per save
            // instead of replacing its contents (found via a real hotel with 14-15x
            // duplicated rows per service after repeated settings saves).
            if (req.getEnabledServices() != null) {
                h.getEnabledServices().clear();
                h.getEnabledServices().addAll(req.getEnabledServices());
            }
            return ResponseEntity.ok(ApiResponse.ok("Updated", hotelRepo.save(h)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Real, scannable, backend-tracked QR for the whole hotel (lobby/front-desk) — same
    // synthetic "hotel-{hotelId}" shopId bucket as room QRs, but QrType.HOTEL (no room
    // number), so guests land on GuestServices.jsx without a room context and get
    // prompted to scan their own room's QR for Requests/Bill — mirrors mall-service's
    // Mall QR (MallController#createMallQrCode) and shop-service's Brand QR.
    @PostMapping("/api/v1/hotels/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createHotelQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String syntheticShopId = "hotel-" + id;
        try {
            Map<String, Object> qr = findHotelQr(syntheticShopId);
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + syntheticShopId
                        + "?label=" + hotel.getName() + "&type=HOTEL";
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // Another concurrent request (e.g. React StrictMode's double-effect in dev, or
                    // a genuine simultaneous double-click) may have just inserted the same
                    // deterministic slug — re-check before giving up.
                    qr = findHotelQr(syntheticShopId);
                    if (qr == null) throw createEx;
                }
            }
            return ResponseEntity.ok(ApiResponse.ok("QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create QR for hotel {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // Picks the newest row for the type — after a regenerate, the deactivated old
    // row for the same type/group is still in the list (kept for its scan
    // history) and the list has no guaranteed order, so find-or-create/toggle
    // must pick by recency rather than list position or it can resurrect a
    // rotated-out QR. A merely-toggled-off room QR (no regenerate) is still the
    // newest row, so this doesn't spawn a duplicate on next find-or-create.
    private Map<String, Object> findHotelQr(String syntheticShopId) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + syntheticShopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream()
            .filter(q -> "HOTEL".equals(q.get("type")))
            .max(Comparator.comparing(q -> String.valueOf(q.get("createdAt"))))
            .orElse(null);
    }

    // ── Rooms ─────────────────────────────────────────────────────────────────
    @GetMapping("/api/v1/rooms/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<Room>>> getRooms(@PathVariable UUID hotelId) {
        return ResponseEntity.ok(ApiResponse.ok(roomRepo.findByHotelId(hotelId)));
    }

    @PostMapping("/api/v1/rooms")
    public ResponseEntity<ApiResponse<Room>> createRoom(
            @RequestBody Room room,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok("Created", roomRepo.save(room)));
    }

    @PutMapping("/api/v1/rooms/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateRoomStatus(@PathVariable UUID id, @RequestParam String status) {
        roomRepo.findById(id).ifPresent(r -> { r.setStatus(RoomStatus.valueOf(status.toUpperCase())); roomRepo.save(r); });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    // Occupancy snapshot sync from pms-service on check-in/check-out — keeps the QR
    // guest-services dashboard (Room.guestName/checkInDate/checkOutDate/status) showing
    // who's actually in the room without pms-service writing into this service's own
    // tables directly. Internal call, not gateway-routed to end users.
    @PutMapping("/api/v1/rooms/{id}/occupancy")
    public ResponseEntity<ApiResponse<Void>> updateRoomOccupancy(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        roomRepo.findById(id).ifPresent(r -> {
            r.setGuestName(blankToNull(body.get("guestName")));
            r.setCheckInDate(blankToNull(body.get("checkInDate")));
            r.setCheckOutDate(blankToNull(body.get("checkOutDate")));
            if (body.get("status") != null) r.setStatus(RoomStatus.valueOf(body.get("status").toUpperCase()));
            roomRepo.save(r);
            // Checkout (occupancy going back to VACANT) hands the room to housekeeping —
            // it isn't resold until DONE/INSPECTED, see AvailabilityService in pms-service.
            if (r.getStatus() == RoomStatus.VACANT) {
                housekeepingService.createTaskForCheckout(r.getHotelId(), r.getId(), r.getRoomNumber());
            }
        });
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    private String blankToNull(String s) { return (s == null || s.isBlank()) ? null : s; }

    // Toggling the switch here also flips the underlying order-qr-service row's
    // `active` flag (via the internal endpoint, no ADMIN/SUPPORT gate) so that
    // scanning a "deactivated" room QR actually stops resolving (410) instead of
    // the toggle being cosmetic — see qr-service's QrService#resolveAndTrack.
    @PutMapping("/api/v1/rooms/{id}/qr")
    public ResponseEntity<ApiResponse<Void>> toggleRoomQr(
            @PathVariable UUID id, @RequestParam boolean active,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        room.setQrActive(active); roomRepo.save(room);
        try {
            Map<String, Object> qr = findRoomQr("hotel-" + room.getHotelId(), room.getRoomNumber());
            if (qr != null) {
                restTemplate.put(qrServiceUrl + "/api/v1/qr-codes/internal/" + qr.get("id") + "/active?active=" + active, null);
            }
        } catch (Exception e) {
            log.warn("Failed to propagate QR active={} for room {}: {}", active, id, e.getMessage());
        }
        return ResponseEntity.ok(ApiResponse.ok("Updated", null));
    }

    // Rotates a room's QR to a new slug — the old one is deactivated (scanning it
    // now returns 410) so a compromised/leaked room QR can be invalidated without
    // affecting the room's booking data. Staff must reprint/redisplay the new code.
    @PostMapping("/api/v1/rooms/{id}/qr-code/regenerate")
    public ResponseEntity<ApiResponse<Map>> regenerateRoomQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String, Object> qr = findRoomQr("hotel-" + room.getHotelId(), room.getRoomNumber());
        if (qr == null) return ResponseEntity.badRequest().body(ApiResponse.error("No QR code exists for this room yet"));
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.postForObject(
                qrServiceUrl + "/api/v1/qr-codes/internal/" + qr.get("id") + "/regenerate", null, Map.class);
            room.setQrActive(true); roomRepo.save(room);
            Map<String, Object> data = resp != null ? (Map<String, Object>) resp.get("data") : null;
            return ResponseEntity.ok(ApiResponse.ok("QR regenerated", data));
        } catch (Exception e) {
            log.warn("Failed to regenerate QR for room {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // All QR codes (hotel-wide + every room) in one call, for the QR Management
    // grid — avoids one find-or-create round trip per room.
    @GetMapping("/api/v1/hotels/{id}/qr-codes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHotelQrCodes(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> listResp = restTemplate.getForObject(
                qrServiceUrl + "/api/v1/qr-codes/shop/hotel-" + id, Map.class);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> existing = listResp != null
                ? (List<Map<String, Object>>) listResp.get("data") : List.of();
            return ResponseEntity.ok(ApiResponse.ok(existing));
        } catch (Exception e) {
            log.warn("Failed to list QR codes for hotel {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // Rotates the whole-hotel (lobby/front-desk) QR — same rationale as the
    // per-room regenerate above.
    @PostMapping("/api/v1/hotels/{id}/qr-code/regenerate")
    public ResponseEntity<ApiResponse<Map>> regenerateHotelQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        Map<String, Object> qr = findHotelQr("hotel-" + id);
        if (qr == null) return ResponseEntity.badRequest().body(ApiResponse.error("No QR code exists for this hotel yet"));
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.postForObject(
                qrServiceUrl + "/api/v1/qr-codes/internal/" + qr.get("id") + "/regenerate", null, Map.class);
            Map<String, Object> data = resp != null ? (Map<String, Object>) resp.get("data") : null;
            return ResponseEntity.ok(ApiResponse.ok("QR regenerated", data));
        } catch (Exception e) {
            log.warn("Failed to regenerate QR for hotel {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // ── QR scan analytics ────────────────────────────────────────────────────
    // Thin authenticated proxies over qr-service's shop-scoped analytics
    // endpoints (which have no auth check of their own — see the comment on
    // those endpoints) — this access check is what makes them safe to expose.
    @GetMapping("/api/v1/hotels/{id}/qr-analytics/trend")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> qrScanTrend(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return proxyAnalytics("/api/v1/qr-codes/shop/hotel-" + id + "/analytics/trend?days=" + days, id);
    }

    @GetMapping("/api/v1/hotels/{id}/qr-analytics/by-room")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> qrScansByRoom(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return proxyAnalytics("/api/v1/qr-codes/shop/hotel-" + id + "/analytics/by-room", id);
    }

    @GetMapping("/api/v1/hotels/{id}/qr-analytics/recent")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> qrRecentScans(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "50") int limit,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(id, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return proxyAnalytics("/api/v1/qr-codes/shop/hotel-" + id + "/analytics/recent?limit=" + limit, id);
    }

    private ResponseEntity<ApiResponse<List<Map<String, Object>>>> proxyAnalytics(String path, UUID hotelId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(qrServiceUrl + path, Map.class);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> data = resp != null ? (List<Map<String, Object>>) resp.get("data") : List.of();
            return ResponseEntity.ok(ApiResponse.ok(data));
        } catch (Exception e) {
            log.warn("Failed to fetch QR scan analytics for hotel {}: {}", hotelId, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // Generates (or returns the already-existing) real, scannable QR for a room via
    // qr-service — rooms have no shop-service Shop of their own, so they share a
    // synthetic "hotel-{hotelId}" shopId bucket, distinguished by groupParam=roomNumber
    // (same convention as qr-service's QrService.buildUrl HOTEL_ROOM case).
    @PostMapping("/api/v1/rooms/{id}/qr-code")
    public ResponseEntity<ApiResponse<Map>> createRoomQrCode(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Room room = roomRepo.findById(id).orElse(null);
        if (room == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(room.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));

        String syntheticShopId = "hotel-" + room.getHotelId();
        try {
            Map<String, Object> qr = findRoomQr(syntheticShopId, room.getRoomNumber());
            if (qr == null) {
                try {
                    String url = qrServiceUrl + "/api/v1/qr-codes/internal/shop/" + syntheticShopId
                        + "?label=Room " + room.getRoomNumber() + "&type=HOTEL_ROOM&group=" + room.getRoomNumber();
                    @SuppressWarnings("unchecked")
                    Map<String, Object> createResp = restTemplate.postForObject(url, null, Map.class);
                    qr = createResp != null ? (Map<String, Object>) createResp.get("data") : null;
                } catch (Exception createEx) {
                    // Another concurrent request (e.g. React StrictMode's double-effect in dev, or
                    // a genuine simultaneous double-click) may have just inserted the same
                    // deterministic slug — re-check before giving up.
                    qr = findRoomQr(syntheticShopId, room.getRoomNumber());
                    if (qr == null) throw createEx;
                }
            }
            room.setQrActive(true); roomRepo.save(room);
            return ResponseEntity.ok(ApiResponse.ok("QR ready", qr));
        } catch (Exception e) {
            log.warn("Failed to create QR for room {}: {}", id, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach qr-service"));
        }
    }

    // Picks the newest row for the room — see findHotelQr's comment above for why.
    private Map<String, Object> findRoomQr(String syntheticShopId, String roomNumber) {
        @SuppressWarnings("unchecked")
        Map<String, Object> listResp = restTemplate.getForObject(
            qrServiceUrl + "/api/v1/qr-codes/shop/" + syntheticShopId, Map.class);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> existing = listResp != null
            ? (List<Map<String, Object>>) listResp.get("data") : List.of();
        return existing.stream()
            .filter(q -> "HOTEL_ROOM".equals(q.get("type")) && roomNumber.equals(q.get("groupParam")))
            .max(Comparator.comparing(q -> String.valueOf(q.get("createdAt"))))
            .orElse(null);
    }

    // ── Room Requests ─────────────────────────────────────────────────────────
    @PostMapping("/api/v1/room-requests")
    public ResponseEntity<ApiResponse<RoomRequest>> createRequest(@RequestBody RoomRequest req) {
        RoomRequest saved = reqRepo.save(req);
        try {
            rabbit.convertAndSend("aviqr.hotel", "request.new",
                Map.of("requestId", saved.getId().toString(), "hotelId", req.getHotelId().toString(),
                       "roomNumber", req.getRoomNumber(), "service", req.getServiceType()));
        } catch (Exception ignored) {}
        return ResponseEntity.ok(ApiResponse.ok("Request submitted", saved));
    }

    @GetMapping("/api/v1/room-requests/hotel/{hotelId}")
    public ResponseEntity<ApiResponse<List<RoomRequest>>> getHotelRequests(
            @PathVariable UUID hotelId,
            @RequestParam(required=false) String service,
            @RequestParam(required=false, defaultValue="false") boolean liveOnly,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!accessService.hasAccess(hotelId, uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        List<RoomRequest> result;
        if (service != null) {
            result = reqRepo.findByHotelIdAndServiceTypeOrderByCreatedAtDesc(hotelId, service.toUpperCase());
        } else if (liveOnly) {
            result = reqRepo.findByHotelIdAndStatusInOrderByCreatedAtDesc(hotelId,
                List.of(RequestStatus.NEW, RequestStatus.ACCEPTED, RequestStatus.PREPARING));
        } else {
            result = reqRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PutMapping("/api/v1/room-requests/{id}/status")
    public ResponseEntity<ApiResponse<RoomRequest>> updateRequestStatus(
            @PathVariable UUID id, @RequestParam String status) {
        return reqRepo.findById(id).map(r -> {
            r.setStatus(RequestStatus.valueOf(status.toUpperCase()));
            if (status.equalsIgnoreCase("DONE")) r.setResolvedAt(LocalDateTime.now());
            return ResponseEntity.ok(ApiResponse.ok("Updated", reqRepo.save(r)));
        }).orElse(ResponseEntity.notFound().build());
    }
}