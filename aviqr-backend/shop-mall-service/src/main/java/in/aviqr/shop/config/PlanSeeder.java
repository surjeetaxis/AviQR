package in.aviqr.shop.config;

import in.aviqr.shop.entity.Plan;
import in.aviqr.shop.entity.PlanVertical;
import in.aviqr.shop.repository.PlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// One-time seed of the default plans (previously hardcoded independently across
// AdminDashboard/Settings/Landing/SubscriptionPage) so the Plan table isn't empty
// on first boot. Only runs when the table is empty — admin edits afterwards are final.
@Component @RequiredArgsConstructor
public class PlanSeeder implements CommandLineRunner {
    private final PlanRepository repo;

    @Override
    public void run(String... args) {
        if (repo.count() > 0) return;

        seed("STARTER",  "Starter",     PlanVertical.SHOP, 0,
            "Up to 20 menu items\n50 orders/day\n1 QR code\nBasic analytics\nEmail support", 0);
        seed("GROWTH",   "Growth",      PlanVertical.SHOP, 999,
            "Unlimited items & orders\nDynamic pricing\nOCR menu upload\nStaff roles (10)\nLoyalty & wallet\nWhatsApp campaigns\nPriority support", 1);
        seed("BUSINESS", "Business",    PlanVertical.SHOP, 2499,
            "Everything in Growth\nMulti-outlet dashboard\nCRM & retention\nAI recommendations\nAPI access\nDedicated support\nCustom QR design", 2);
        seed("ENTERPRISE","Enterprise", PlanVertical.SHOP, 0,
            "Everything in Business\nCustom contract & SLA\nOn-premise option\nDedicated account manager", 3);

        seed("HOTEL_BASIC",  "Hotel Basic",  PlanVertical.HOTEL, 1499,
            "Up to 50 rooms\nRoom service QR\nBasic guest requests\nOrder tracking\nEmail support", 0);
        seed("HOTEL_PRO",    "Hotel Pro",    PlanVertical.HOTEL, 3499,
            "Unlimited rooms\nAll service types\nHousekeeping module\nLaundry & spa\nMaintenance tracking\nAnalytics dashboard\nPriority support", 1);
        seed("HOTEL_RESORT", "Resort Suite", PlanVertical.HOTEL, 7999,
            "Everything in Pro\nMulti-property\nGuest loyalty\nPMS integration\nCustom branding\nAPI access\nDedicated manager", 2);

        seed("MALL_BASIC",      "Mall Basic",  PlanVertical.MALL, 2499,
            "Up to 10 vendors\nMall QR code\nBasic analytics\nVendor management\nEmail support", 0);
        seed("MALL_PRO",        "Mall Pro",    PlanVertical.MALL, 5999,
            "Unlimited vendors\nRevenue sharing\nCommission tracking\nAll QR types\nVendor billing\nReports\nPriority support", 1);
        seed("MALL_ENTERPRISE", "Enterprise",  PlanVertical.MALL, 14999,
            "Everything in Pro\nMulti-mall management\nCustom integrations\nFootfall analytics\nAPI access\nDedicated team", 2);

        seed("SUPPLIER_BASIC",      "Brand Basic", PlanVertical.SUPPLIER, 1999,
            "Up to 3 outlets\nCentral menu sync\nBasic reports\nOrder management\nEmail support", 0);
        seed("SUPPLIER_PRO",        "Brand Pro",   PlanVertical.SUPPLIER, 4499,
            "Up to 10 outlets\nCentral pricing\nAnalytics\nLoyalty sync\nStaff roles\nPriority support", 1);
        seed("SUPPLIER_ENTERPRISE", "Enterprise",  PlanVertical.SUPPLIER, 9999,
            "Unlimited outlets\nFranchise management\nAI analytics\nAPI access\nCustom branding\nDedicated manager", 2);
    }

    private void seed(String key, String label, PlanVertical vertical, int price, String features, int sortOrder) {
        repo.save(Plan.builder()
            .planKey(key).label(label).vertical(vertical).price(price)
            .features(features).sortOrder(sortOrder).active(true).build());
    }
}
