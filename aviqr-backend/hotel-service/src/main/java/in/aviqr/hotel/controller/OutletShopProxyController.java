package in.aviqr.hotel.controller;

import in.aviqr.hotel.dto.ApiResponse;
import in.aviqr.hotel.entity.HotelOutlet;
import in.aviqr.hotel.repository.HotelOutletRepository;
import in.aviqr.hotel.service.HotelAccessService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

/**
 * Fronts the two shop-service owner-only reads that authorize via an X-Shop-Id header
 * (StaffController.getStaff, LoyaltyController.customers). The API gateway sets X-Shop-Id
 * from the caller's JWT, which is blank for a HOTEL-role user, so a hotel owner can never
 * pass that check directly. Hotel-service verifies hotel/outlet access itself here, then
 * calls shop-service on the caller's behalf using the outlet's linked shopId.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class OutletShopProxyController {

    private final HotelOutletRepository outletRepo;
    private final HotelAccessService accessService;
    private final RestTemplate restTemplate;

    @Value("${shop.service.url:http://shop-mall-service}")
    private String shopServiceUrl;

    @GetMapping("/api/v1/hotel-outlets/{outletId}/staff")
    public ResponseEntity<?> staff(
            @PathVariable UUID outletId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return proxy(outletId, uid, role, "/api/v1/staff/shop/");
    }

    @GetMapping("/api/v1/hotel-outlets/{outletId}/loyalty-customers")
    public ResponseEntity<?> loyaltyCustomers(
            @PathVariable UUID outletId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        return proxy(outletId, uid, role, "/api/v1/loyalty/", "/customers");
    }

    private ResponseEntity<?> proxy(UUID outletId, String uid, String role, String pathPrefix) {
        return proxy(outletId, uid, role, pathPrefix, "");
    }

    private ResponseEntity<?> proxy(UUID outletId, String uid, String role, String pathPrefix, String pathSuffix) {
        HotelOutlet outlet = outletRepo.findById(outletId).orElse(null);
        if (outlet == null) return ResponseEntity.notFound().build();
        if (!accessService.hasAccess(outlet.getHotelId(), uid, role))
            return ResponseEntity.status(403).body(ApiResponse.error("Forbidden"));
        if (outlet.getShopId() == null || outlet.getShopId().isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("Outlet has no linked shop"));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Shop-Id", outlet.getShopId());
            headers.set("X-User-Role", "MANAGER");
            String url = shopServiceUrl + pathPrefix + outlet.getShopId() + pathSuffix;
            ResponseEntity<Object> resp = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), Object.class);
            return ResponseEntity.status(resp.getStatusCode()).body(resp.getBody());
        } catch (Exception e) {
            log.warn("Failed to proxy shop request for outlet {}: {}", outletId, e.getMessage());
            return ResponseEntity.status(502).body(ApiResponse.error("Could not reach shop-service"));
        }
    }
}
