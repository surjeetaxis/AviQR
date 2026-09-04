package in.aviqr.pms.controller;

import in.aviqr.pms.dto.ApiResponse;
import in.aviqr.pms.dto.ChainPushResult;
import in.aviqr.pms.entity.ChainRatePlanTemplate;
import in.aviqr.pms.entity.ChainRoomTypeTemplate;
import in.aviqr.pms.entity.MealPlan;
import in.aviqr.pms.service.ChainTemplateService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Chain-level room type / rate templates + push-to-properties. See
 *  ChainTemplateService for the design rationale. Every endpoint delegates
 *  chain-ownership access control to hotel-service via that service's calls —
 *  none of these check access locally. */
@RestController @RequiredArgsConstructor
public class ChainTemplateController {

    private final ChainTemplateService chainTemplateService;

    @PostMapping("/api/v1/pms/chains/{chainId}/room-type-templates")
    public ResponseEntity<ApiResponse<ChainRoomTypeTemplate>> createRoomTypeTemplate(
            @PathVariable UUID chainId, @RequestBody RoomTypeTemplateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Created",
            chainTemplateService.createRoomTypeTemplate(chainId, req.getName(), req.getDescription(), req.getMaxOccupancy())));
    }

    @GetMapping("/api/v1/pms/chains/{chainId}/room-type-templates")
    public ResponseEntity<ApiResponse<List<ChainRoomTypeTemplate>>> listRoomTypeTemplates(@PathVariable UUID chainId) {
        return ResponseEntity.ok(ApiResponse.ok(chainTemplateService.listRoomTypeTemplates(chainId)));
    }

    @PostMapping("/api/v1/pms/chains/{chainId}/rate-plan-templates")
    public ResponseEntity<ApiResponse<ChainRatePlanTemplate>> createRatePlanTemplate(
            @PathVariable UUID chainId, @RequestBody RatePlanTemplateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Created",
            chainTemplateService.createRatePlanTemplate(chainId, req.getRoomTypeTemplateId(), req.getName(),
                req.getBaseRate(), req.getMealPlan())));
    }

    @GetMapping("/api/v1/pms/chains/{chainId}/rate-plan-templates")
    public ResponseEntity<ApiResponse<List<ChainRatePlanTemplate>>> listRatePlanTemplates(@PathVariable UUID chainId) {
        return ResponseEntity.ok(ApiResponse.ok(chainTemplateService.listRatePlanTemplates(chainId)));
    }

    @PostMapping("/api/v1/pms/chains/{chainId}/push")
    public ResponseEntity<ApiResponse<ChainPushResult>> push(
            @PathVariable UUID chainId,
            @RequestHeader("X-User-Id") String uid,
            @RequestHeader(value="X-User-Role", defaultValue="") String role) {
        try {
            return ResponseEntity.ok(ApiResponse.ok("Pushed to every property",
                chainTemplateService.pushToProperties(chainId, uid, role)));
        } catch (HttpClientErrorException.Forbidden e) {
            return ResponseEntity.status(403).body(ApiResponse.error("Only the chain owner can push templates"));
        }
    }

    @Data
    public static class RoomTypeTemplateRequest {
        private String name;
        private String description;
        private Integer maxOccupancy;
    }

    @Data
    public static class RatePlanTemplateRequest {
        private UUID roomTypeTemplateId;
        private String name;
        private BigDecimal baseRate;
        private MealPlan mealPlan;
    }
}
