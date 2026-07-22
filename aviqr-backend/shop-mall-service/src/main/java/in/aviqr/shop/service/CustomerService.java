package in.aviqr.shop.service;

import in.aviqr.shop.dto.CustomerProfileResponse;
import in.aviqr.shop.entity.Customer;
import in.aviqr.shop.entity.LoyaltyAccount;
import in.aviqr.shop.repository.CustomerRepository;
import in.aviqr.shop.repository.LoyaltyAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * MARKET FEATURE: unified customer profile — merges the CRM identity fields
 * held in Customer (birthday, anniversary, notes, labels) with the stats
 * already tracked by LoyaltyAccount (points, orders, spend, last visit).
 */
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepo;
    private final LoyaltyAccountRepository loyaltyRepo;

    @Transactional
    public Customer upsertProfile(String shopId, String phone, String name, String email,
                                   LocalDate birthday, LocalDate anniversary) {
        Customer customer = customerRepo.findByCustomerPhoneAndShopId(phone, shopId)
            .orElseGet(() -> Customer.builder()
                .customerPhone(phone)
                .shopId(shopId)
                .build());
        if (name != null) customer.setCustomerName(name);
        if (email != null) customer.setEmail(email);
        if (birthday != null) customer.setBirthday(birthday);
        if (anniversary != null) customer.setAnniversary(anniversary);
        return customerRepo.save(customer);
    }

    @Transactional
    public Customer updateNotes(String shopId, String phone, String notes) {
        Customer customer = findOrCreate(shopId, phone);
        customer.setNotes(notes);
        return customerRepo.save(customer);
    }

    @Transactional
    public Customer addLabel(String shopId, String phone, String label) {
        Customer customer = findOrCreate(shopId, phone);
        if (!customer.getLabels().contains(label)) customer.getLabels().add(label);
        return customerRepo.save(customer);
    }

    @Transactional
    public Customer removeLabel(String shopId, String phone, String label) {
        Customer customer = findOrCreate(shopId, phone);
        customer.getLabels().remove(label);
        return customerRepo.save(customer);
    }

    public CustomerProfileResponse getProfile(String shopId, String phone) {
        Optional<Customer> customer = customerRepo.findByCustomerPhoneAndShopId(phone, shopId);
        Optional<LoyaltyAccount> loyalty = loyaltyRepo.findByCustomerPhoneAndShopId(phone, shopId);
        return merge(phone, customer.orElse(null), loyalty.orElse(null));
    }

    /** CRM list — merges every Customer profile and LoyaltyAccount for the shop, keyed by phone. */
    public List<CustomerProfileResponse> listUnified(String shopId) {
        Map<String, Customer> customers = new LinkedHashMap<>();
        for (Customer c : customerRepo.findByShopId(shopId)) customers.put(c.getCustomerPhone(), c);

        Map<String, LoyaltyAccount> loyaltyAccounts = new LinkedHashMap<>();
        for (LoyaltyAccount a : loyaltyRepo.findByShopIdOrderByTotalPointsDesc(shopId)) loyaltyAccounts.put(a.getCustomerPhone(), a);

        Map<String, CustomerProfileResponse> merged = new LinkedHashMap<>();
        for (String phone : loyaltyAccounts.keySet()) merged.put(phone, merge(phone, customers.get(phone), loyaltyAccounts.get(phone)));
        for (String phone : customers.keySet()) merged.computeIfAbsent(phone, p -> merge(p, customers.get(p), null));

        return merged.values().stream()
            .sorted((a, b) -> Integer.compare(
                b.getTotalPoints() == null ? 0 : b.getTotalPoints(),
                a.getTotalPoints() == null ? 0 : a.getTotalPoints()))
            .toList();
    }

    private Customer findOrCreate(String shopId, String phone) {
        return customerRepo.findByCustomerPhoneAndShopId(phone, shopId)
            .orElseGet(() -> Customer.builder().customerPhone(phone).shopId(shopId).build());
    }

    private CustomerProfileResponse merge(String phone, Customer customer, LoyaltyAccount loyalty) {
        String name = customer != null && customer.getCustomerName() != null
            ? customer.getCustomerName()
            : (loyalty != null ? loyalty.getCustomerName() : null);
        return CustomerProfileResponse.builder()
            .customerPhone(phone)
            .customerName(name)
            .email(customer != null ? customer.getEmail() : null)
            .birthday(customer != null ? customer.getBirthday() : null)
            .anniversary(customer != null ? customer.getAnniversary() : null)
            .notes(customer != null ? customer.getNotes() : null)
            .labels(customer != null ? customer.getLabels() : List.of())
            .totalPoints(loyalty != null ? loyalty.getTotalPoints() : 0)
            .lifetimePoints(loyalty != null ? loyalty.getLifetimePoints() : 0)
            .totalOrders(loyalty != null ? loyalty.getTotalOrders() : 0)
            .totalVisits(loyalty != null ? loyalty.getTotalVisits() : 0)
            .totalSpent(loyalty != null ? loyalty.getTotalSpent() : null)
            .lastVisitAt(loyalty != null ? loyalty.getLastVisitAt() : null)
            .build();
    }
}
