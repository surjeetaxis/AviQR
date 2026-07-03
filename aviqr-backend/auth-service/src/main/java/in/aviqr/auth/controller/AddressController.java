package in.aviqr.auth.controller;

import in.aviqr.auth.dto.AddressRequest;
import in.aviqr.auth.dto.ApiResponse;
import in.aviqr.auth.entity.CustomerAddress;
import in.aviqr.auth.repository.CustomerAddressRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/addresses")
@RequiredArgsConstructor
public class AddressController {

    private final CustomerAddressRepository addressRepo;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerAddress>>> mine(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.ok(addressRepo.findByUserIdOrderByIsDefaultDescCreatedAtDesc(UUID.fromString(userId))));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<CustomerAddress>> create(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody AddressRequest req) {
        UUID uid = UUID.fromString(userId);
        if (req.isDefault()) clearDefault(uid);
        CustomerAddress saved = addressRepo.save(CustomerAddress.builder()
            .userId(uid).label(req.getLabel()).line1(req.getLine1()).line2(req.getLine2())
            .city(req.getCity()).state(req.getState()).pincode(req.getPincode())
            .phone(req.getPhone()).isDefault(req.isDefault())
            .build());
        return ResponseEntity.ok(ApiResponse.ok("Address added", saved));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<CustomerAddress>> update(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id,
            @Valid @RequestBody AddressRequest req) {
        UUID uid = UUID.fromString(userId);
        CustomerAddress addr = addressRepo.findById(id).orElse(null);
        if (addr == null || !addr.getUserId().equals(uid))
            return ResponseEntity.status(404).body(ApiResponse.error("Address not found"));
        if (req.isDefault() && !addr.isDefault()) clearDefault(uid);
        addr.setLabel(req.getLabel()); addr.setLine1(req.getLine1()); addr.setLine2(req.getLine2());
        addr.setCity(req.getCity()); addr.setState(req.getState()); addr.setPincode(req.getPincode());
        addr.setPhone(req.getPhone()); addr.setDefault(req.isDefault());
        return ResponseEntity.ok(ApiResponse.ok("Address updated", addressRepo.save(addr)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable UUID id) {
        UUID uid = UUID.fromString(userId);
        CustomerAddress addr = addressRepo.findById(id).orElse(null);
        if (addr == null || !addr.getUserId().equals(uid))
            return ResponseEntity.status(404).body(ApiResponse.error("Address not found"));
        addressRepo.delete(addr);
        return ResponseEntity.ok(ApiResponse.ok("Address deleted", null));
    }

    private void clearDefault(UUID userId) {
        addressRepo.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId).stream()
            .filter(CustomerAddress::isDefault)
            .forEach(a -> { a.setDefault(false); addressRepo.save(a); });
    }
}
