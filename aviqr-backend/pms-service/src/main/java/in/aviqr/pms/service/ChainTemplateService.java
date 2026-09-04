package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.HotelSummaryDto;
import in.aviqr.pms.dto.ChainPushResult;
import in.aviqr.pms.entity.ChainRatePlanTemplate;
import in.aviqr.pms.entity.ChainRoomTypeTemplate;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.ChainRatePlanTemplateRepository;
import in.aviqr.pms.repository.ChainRoomTypeTemplateRepository;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Chain-level centralized room type / rate management — a gap found comparing
 * against the legacy CRS's chain module: define a room type + rate plan once at
 * the chain level, then push it to every member property instead of each hotel
 * self-managing its own from scratch. A property's RoomType/RatePlan rows are
 * still the real, per-hotel source of truth (availability/booking reads those
 * directly, unchanged) — a template push just find-or-creates/updates them by
 * matching on name, so pushing the same template twice is idempotent rather than
 * creating duplicates, and a hotel can still tweak its own copy afterward without
 * that being clobbered until the next push.
 */
@Service @RequiredArgsConstructor
public class ChainTemplateService {

    private final HotelServiceClient hotelServiceClient;
    private final ChainRoomTypeTemplateRepository roomTypeTemplateRepo;
    private final ChainRatePlanTemplateRepository ratePlanTemplateRepo;
    private final RoomTypeRepository roomTypeRepo;
    private final RatePlanRepository ratePlanRepo;

    public ChainRoomTypeTemplate createRoomTypeTemplate(UUID chainId, String name, String description, Integer maxOccupancy) {
        return roomTypeTemplateRepo.save(ChainRoomTypeTemplate.builder()
            .chainId(chainId).name(name).description(description)
            .maxOccupancy(maxOccupancy != null ? maxOccupancy : 2).build());
    }

    public List<ChainRoomTypeTemplate> listRoomTypeTemplates(UUID chainId) {
        return roomTypeTemplateRepo.findByChainIdAndActiveTrue(chainId);
    }

    public ChainRatePlanTemplate createRatePlanTemplate(UUID chainId, UUID roomTypeTemplateId, String name,
                                                          java.math.BigDecimal baseRate, in.aviqr.pms.entity.MealPlan mealPlan) {
        return ratePlanTemplateRepo.save(ChainRatePlanTemplate.builder()
            .chainId(chainId).roomTypeTemplateId(roomTypeTemplateId).name(name)
            .baseRate(baseRate).mealPlan(mealPlan != null ? mealPlan : in.aviqr.pms.entity.MealPlan.ROOM_ONLY)
            .build());
    }

    public List<ChainRatePlanTemplate> listRatePlanTemplates(UUID chainId) {
        return ratePlanTemplateRepo.findByChainIdAndActiveTrue(chainId);
    }

    /** uid/role are the caller's — access is delegated entirely to hotel-service's
     *  ChainController (getHotelsInChain), which only lets the chain's own owner
     *  (or ADMIN/SUPPORT) list its member hotels; anyone else gets a Forbidden that
     *  propagates straight out of this method. */
    public ChainPushResult pushToProperties(UUID chainId, String uid, String role) {
        List<HotelSummaryDto> hotels = hotelServiceClient.getHotelsInChain(chainId, uid, role);
        List<ChainRoomTypeTemplate> roomTypeTemplates = roomTypeTemplateRepo.findByChainIdAndActiveTrue(chainId);

        int rtCreated = 0, rtUpdated = 0, rpCreated = 0, rpUpdated = 0;
        for (HotelSummaryDto hotel : hotels) {
            for (ChainRoomTypeTemplate rtt : roomTypeTemplates) {
                RoomType roomType = roomTypeRepo.findByHotelIdAndName(hotel.getId(), rtt.getName()).orElse(null);
                boolean isNewRoomType = roomType == null;
                if (isNewRoomType) {
                    roomType = RoomType.builder().hotelId(hotel.getId()).name(rtt.getName()).build();
                }
                roomType.setDescription(rtt.getDescription());
                roomType.setMaxOccupancy(rtt.getMaxOccupancy());
                roomType = roomTypeRepo.save(roomType);
                if (isNewRoomType) rtCreated++; else rtUpdated++;

                for (ChainRatePlanTemplate rpt : ratePlanTemplateRepo.findByRoomTypeTemplateIdAndActiveTrue(rtt.getId())) {
                    RatePlan ratePlan = ratePlanRepo.findByRoomTypeIdAndName(roomType.getId(), rpt.getName()).orElse(null);
                    boolean isNewRatePlan = ratePlan == null;
                    if (isNewRatePlan) {
                        ratePlan = RatePlan.builder().hotelId(hotel.getId()).roomTypeId(roomType.getId()).name(rpt.getName()).build();
                    }
                    ratePlan.setBaseRate(rpt.getBaseRate());
                    ratePlan.setMealPlan(rpt.getMealPlan());
                    ratePlan.setCancellationPolicy(rpt.getCancellationPolicy());
                    ratePlanRepo.save(ratePlan);
                    if (isNewRatePlan) rpCreated++; else rpUpdated++;
                }
            }
        }
        return ChainPushResult.builder()
            .hotelsProcessed(hotels.size())
            .roomTypesCreated(rtCreated).roomTypesUpdated(rtUpdated)
            .ratePlansCreated(rpCreated).ratePlansUpdated(rpUpdated)
            .build();
    }
}
