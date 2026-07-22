package in.aviqr.shop.repository;

import in.aviqr.shop.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByCustomerPhoneAndShopId(String customerPhone, String shopId);
    List<Customer> findByShopId(String shopId);
}
