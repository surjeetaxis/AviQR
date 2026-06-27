package in.aviqr.shop.service;
import in.aviqr.shop.dto.*;
import in.aviqr.shop.entity.*;
import in.aviqr.shop.repository.ShopRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class ShopService {
    private final ShopRepository repo;

    @Transactional
    public ShopResponse create(String ownerId, ShopRequest req) {
        Shop shop = Shop.builder()
            .name(req.getName()).tagline(req.getTagline())
            .ownerId(ownerId).phone(req.getPhone()).email(req.getEmail())
            .address(req.getAddress()).city(req.getCity()).state(req.getState())
            .pincode(req.getPincode()).logoUrl(req.getLogoUrl()).gstin(req.getGstin())
            .minOrderAmount(req.getMinOrderAmount()).tableCount(req.getTableCount())
            .subscriptionPlan("STARTER").build();
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
        shop.setTagline(req.getTagline());
        if(req.getEmail()!=null)   shop.setEmail(req.getEmail());
        if(req.getAddress()!=null) shop.setAddress(req.getAddress());
        if(req.getCity()!=null)    shop.setCity(req.getCity());
        if(req.getState()!=null)   shop.setState(req.getState());
        if(req.getPincode()!=null) shop.setPincode(req.getPincode());
        if(req.getGstin()!=null)   shop.setGstin(req.getGstin());
        if(req.getLogoUrl()!=null) shop.setLogoUrl(req.getLogoUrl());
        if(req.getMinOrderAmount()!=null) shop.setMinOrderAmount(req.getMinOrderAmount());
        if(req.getTableCount()!=null)     shop.setTableCount(req.getTableCount());
        return toDto(repo.save(shop));
    }

    @Transactional
    public void updateStatus(UUID id, ShopStatus status) {
        repo.findById(id).ifPresent(s -> { s.setStatus(status); repo.save(s); });
    }

    public Page<ShopResponse> search(String q, int page, int size, String sort) {
        Page<Shop> shops = "recent".equalsIgnoreCase(sort)
            ? repo.search(q, PageRequest.of(page, size, Sort.by("createdAt").descending()))
            : repo.searchOrderByTier(q, PageRequest.of(page, size));
        return shops.map(this::toDto);
    }

    public Page<ShopResponse> listAll(int page, int size, String sort) {
        Page<Shop> shops = "recent".equalsIgnoreCase(sort)
            ? repo.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
            : repo.findAllOrderByTier(PageRequest.of(page, size));
        return shops.map(this::toDto);
    }

    private ShopResponse toDto(Shop s) {
        ShopResponse r = new ShopResponse();
        r.setId(s.getId()); r.setName(s.getName()); r.setTagline(s.getTagline());
        r.setOwnerId(s.getOwnerId()); r.setPhone(s.getPhone()); r.setEmail(s.getEmail());
        r.setAddress(s.getAddress()); r.setCity(s.getCity()); r.setLogoUrl(s.getLogoUrl());
        r.setStatus(s.getStatus()); r.setMinOrderAmount(s.getMinOrderAmount());
        r.setTableCount(s.getTableCount()); r.setSubscriptionPlan(s.getSubscriptionPlan());
        r.setRating(s.getRating()); r.setRatingCount(s.getRatingCount());
        r.setCompletionRate(s.getCompletionRate()); r.setSalesVolume(s.getSalesVolume());
        r.setReturnPercentage(s.getReturnPercentage()); r.setSatisfactionScore(s.getSatisfactionScore());
        r.setTier(s.getTier()); r.setTierUpdatedAt(s.getTierUpdatedAt());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }
}