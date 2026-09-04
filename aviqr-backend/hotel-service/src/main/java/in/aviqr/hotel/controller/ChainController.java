package in.aviqr.hotel.controller;

import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.Chain;
import in.aviqr.hotel.entity.Hotel;
import in.aviqr.hotel.repository.ChainRepository;
import in.aviqr.hotel.repository.HotelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** CRS's Chain concept: several properties one owner runs under a shared umbrella,
 *  for chain-wide reporting (see pms-service's ChainReportService). A chain is
 *  managed only by the owner who created it (or ADMIN/SUPPORT) — simpler than
 *  per-hotel HotelAccess, since a chain's whole point is one owner's own properties. */
@RestController @RequiredArgsConstructor
public class ChainController {

    private final ChainRepository chainRepo;
    private final HotelRepository hotelRepo;

    @PostMapping("/api/v1/chains")
    public ResponseEntity<ApiResponse<Chain>> create(
            @RequestBody Chain req,
            @RequestHeader("X-User-Id") String uid) {
        req.setId(null);
        req.setOwnerId(uid);
        return ResponseEntity.ok(ApiResponse.ok("Chain created", chainRepo.save(req)));
    }

    @GetMapping("/api/v1/chains/owner/{userId}")
    public ResponseEntity<ApiResponse<List<Chain>>> listForOwner(
            @PathVariable String userId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        if (!canManage(userId, uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(chainRepo.findByOwnerId(userId)));
    }

    @GetMapping("/api/v1/chains/{id}/hotels")
    public ResponseEntity<ApiResponse<List<Hotel>>> hotelsInChain(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Chain chain = chainRepo.findById(id).orElse(null);
        if (chain == null) return ResponseEntity.notFound().build();
        if (!canManage(chain.getOwnerId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        return ResponseEntity.ok(ApiResponse.ok(hotelRepo.findByChainId(id)));
    }

    @PutMapping("/api/v1/hotels/{id}/chain")
    public ResponseEntity<ApiResponse<Hotel>> assignChain(
            @PathVariable UUID id, @RequestParam(required=false) UUID chainId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        Hotel hotel = hotelRepo.findById(id).orElse(null);
        if (hotel == null) return ResponseEntity.notFound().build();
        if (!canManage(hotel.getOwnerId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (chainId != null) {
            Chain chain = chainRepo.findById(chainId).orElse(null);
            if (chain == null) return ResponseEntity.badRequest().body(ApiResponse.error("Chain not found"));
            if (!canManage(chain.getOwnerId(), uid, role)) return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        }
        hotel.setChainId(chainId);
        return ResponseEntity.ok(ApiResponse.ok("Updated", hotelRepo.save(hotel)));
    }

    private boolean canManage(String resourceOwnerId, String uid, String role) {
        return "ADMIN".equals(role) || "SUPPORT".equals(role) || resourceOwnerId.equals(uid);
    }
}
