package in.aviqr.shop.service;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.PlanRepository;
import in.aviqr.shop.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service @RequiredArgsConstructor
public class ShopService {
    private final ShopRepository repo;
    private final PlanRepository planRepo;

    private static final int TRIAL_DAYS = 90;

    @Transactional
    public ShopResponse create(String ownerId, ShopRequest req) {
        String requestedKey = (req.getSubscriptionPlan() == null || req.getSubscriptionPlan().isBlank())
            ? "STARTER" : req.getSubscriptionPlan().toUpperCase();
        Plan plan = planRepo.findByPlanKey(requestedKey)
            .filter(p -> p.getVertical() == PlanVertical.SHOP && Boolean.TRUE.equals(p.getActive()))
            .orElseGet(() -> planRepo.findByPlanKey("STARTER").orElse(null));
        String planKey = plan != null ? plan.getPlanKey() : requestedKey;
        boolean isPaid = plan != null && plan.getPrice() != null && plan.getPrice() > 0;
        LocalDateTime now = LocalDateTime.now();

        Shop shop = Shop.builder()
            .name(req.getName()).tagline(req.getTagline())
            .ownerId(ownerId).phone(req.getPhone()).email(req.getEmail())
            .address(req.getAddress()).city(req.getCity()).state(req.getState()).zone(req.getZone())
            .pincode(req.getPincode()).logoUrl(req.getLogoUrl()).gstin(req.getGstin())
            .minOrderAmount(req.getMinOrderAmount()).tableCount(req.getTableCount())
            .latitude(req.getLatitude()).longitude(req.getLongitude())
            .subscriptionPlan(planKey)
            .subscriptionStatus(isPaid ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE)
            .trialEndsAt(isPaid ? now.plusDays(TRIAL_DAYS) : null)
            .planStartedAt(now)
            .build();
        return toDto(repo.save(shop));
    }

    public List<ShopResponse> getMyShops(String ownerId) {
        return repo.findByOwnerId(ownerId).stream().map(this::toDto).toList();
    }

    public Optional<ShopResponse> getById(UUID id) { return repo.findById(id).map(this::toDto); }

    @Transactional
    public ShopResponse update(UUID id, ShopRequest req) {
        Shop shop = repo.findById(id).orElseThrow(() -> new RuntimeException("Shop not found"));
        shop.setName(req.getName()); shop.setPhone(req.getPhone());
        if(req.getTagline()!=null)        shop.setTagline(req.getTagline());
        if(req.getEmail()!=null)          shop.setEmail(req.getEmail());
        if(req.getAddress()!=null)        shop.setAddress(req.getAddress());
        if(req.getCity()!=null)           shop.setCity(req.getCity());
        if(req.getState()!=null)          shop.setState(req.getState());
        if(req.getZone()!=null)           shop.setZone(req.getZone());
        if(req.getPincode()!=null)        shop.setPincode(req.getPincode());
        if(req.getLogoUrl()!=null)        shop.setLogoUrl(req.getLogoUrl());
        if(req.getGstin()!=null)          shop.setGstin(req.getGstin());
        if(req.getMinOrderAmount()!=null) shop.setMinOrderAmount(req.getMinOrderAmount());
        if(req.getTableCount()!=null)     shop.setTableCount(req.getTableCount());
        if(req.getLatitude()!=null)       shop.setLatitude(req.getLatitude());
        if(req.getLongitude()!=null)      shop.setLongitude(req.getLongitude());
        return toDto(repo.save(shop));
    }

    public Optional<Shop> findRaw(UUID id) { return repo.findById(id); }

    @Transactional
    public void updateStatus(UUID id, ShopStatus status) {
        repo.findById(id).ifPresent(s -> { s.setStatus(status); repo.save(s); });
    }

    @Transactional
    public Optional<ShopResponse> updateSubscriptionStatus(UUID id, SubscriptionStatus status) {
        return repo.findById(id).map(s -> {
            s.setSubscriptionStatus(status);
            if (status == SubscriptionStatus.CANCELED) {
                s.setSubscriptionPlan("STARTER");
                s.setTrialEndsAt(null);
            } else if (status == SubscriptionStatus.ACTIVE) {
                s.setTrialEndsAt(null);
            }
            return toDto(repo.save(s));
        });
    }

    @Transactional
    public Optional<Shop> requestCancellation(UUID id) {
        return repo.findById(id).map(s -> {
            s.setCancelRequestedAt(LocalDateTime.now());
            return repo.save(s);
        });
    }

    public Page<ShopResponse> search(String q, int page, int size) {
        return repo.search(q, PageRequest.of(page, size, Sort.by("createdAt").descending())).map(this::toDto);
    }

    public Page<ShopResponse> listAll(int page, int size) {
        return repo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending())).map(this::toDto);
    }

    // Optional re-sort by rating (native query already sorts by distance, the
    // default) since "nearest first" and "best rated first" are the two
    // orderings a customer actually wants — anything else can be added later.
    public List<NearbyShopResponse> nearby(double lat, double lng, double radiusKm, String sort) {
        List<NearbyShopResponse> results = repo.findNearby(lat, lng, radiusKm).stream().map(row -> {
            NearbyShopResponse r = new NearbyShopResponse();
            r.setId((UUID) row[0]);
            r.setName((String) row[1]);
            r.setTagline((String) row[2]);
            r.setCity((String) row[3]);
            r.setLogoUrl((String) row[4]);
            r.setRating((BigDecimal) row[5]);
            r.setRatingCount((Integer) row[6]);
            r.setLatitude((Double) row[7]);
            r.setLongitude((Double) row[8]);
            r.setDistanceKm(((Number) row[9]).doubleValue());
            return r;
        }).collect(Collectors.toList());
        if ("rating".equalsIgnoreCase(sort)) {
            results.sort(Comparator.comparing((NearbyShopResponse r) -> r.getRating() == null ? BigDecimal.ZERO : r.getRating()).reversed());
        }
        return results;
    }

    private ShopResponse toDto(Shop s) {
        ShopResponse r = new ShopResponse();
        r.setId(s.getId()); r.setName(s.getName()); r.setTagline(s.getTagline());
        r.setOwnerId(s.getOwnerId()); r.setPhone(s.getPhone()); r.setEmail(s.getEmail());
        r.setAddress(s.getAddress()); r.setCity(s.getCity()); r.setLogoUrl(s.getLogoUrl());
        r.setState(s.getState()); r.setZone(s.getZone()); r.setPincode(s.getPincode()); r.setGstin(s.getGstin());
        r.setLatitude(s.getLatitude()); r.setLongitude(s.getLongitude());
        r.setStatus(s.getStatus()); r.setMinOrderAmount(s.getMinOrderAmount());
        r.setTableCount(s.getTableCount()); r.setSubscriptionPlan(s.getSubscriptionPlan());
        r.setSubscriptionStatus(s.getSubscriptionStatus()); r.setTrialEndsAt(s.getTrialEndsAt());
        r.setPlanStartedAt(s.getPlanStartedAt()); r.setCancelRequestedAt(s.getCancelRequestedAt());
        r.setRating(s.getRating()); r.setRatingCount(s.getRatingCount());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }
}