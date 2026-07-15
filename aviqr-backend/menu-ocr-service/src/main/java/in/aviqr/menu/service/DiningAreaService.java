package in.aviqr.menu.service;

import in.aviqr.menu.entity.AreaMenuPrice;
import in.aviqr.menu.entity.DiningArea;
import in.aviqr.menu.repository.AreaMenuPriceRepository;
import in.aviqr.menu.repository.DiningAreaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class DiningAreaService {

    private final DiningAreaRepository    areaRepo;
    private final AreaMenuPriceRepository priceRepo;

    public List<DiningArea> getByShop(String shopId) {
        return areaRepo.findByShopIdOrderBySortOrderAsc(shopId);
    }

    public DiningArea create(DiningArea area) {
        return areaRepo.save(area);
    }

    public DiningArea update(UUID id, DiningArea updated) {
        DiningArea existing = areaRepo.findById(id).orElseThrow();
        existing.setName(updated.getName());
        existing.setSortOrder(updated.getSortOrder());
        existing.setActive(updated.getActive());
        return areaRepo.save(existing);
    }

    @Transactional
    public void delete(UUID id) {
        priceRepo.deleteByAreaId(id);
        areaRepo.deleteById(id);
    }

    public List<AreaMenuPrice> getPrices(UUID areaId) {
        return priceRepo.findByAreaId(areaId);
    }

    @Transactional
    public List<AreaMenuPrice> savePrices(UUID areaId, List<AreaMenuPrice> prices) {
        priceRepo.deleteByAreaId(areaId);
        prices.forEach(p -> { p.setId(null); p.setAreaId(areaId); });
        return priceRepo.saveAll(prices);
    }
}
