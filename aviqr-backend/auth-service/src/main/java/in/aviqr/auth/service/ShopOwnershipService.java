package in.aviqr.auth.service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
@Service @RequiredArgsConstructor
public class ShopOwnershipService {
    private final RestTemplate restTemplate;
    public void requireOwner(UUID userId, String shopId) {
        UUID id;
        try { id = UUID.fromString(shopId); }
        catch (Exception e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid shop ID"); }
        Map<?,?> response = restTemplate.getForObject("http://shop-mall-service/api/v1/shops/"+id,Map.class);
        Object data = response == null ? null : response.get("data");
        if (!(data instanceof Map<?,?> shop) || !userId.toString().equals(String.valueOf(shop.get("ownerId"))))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"You do not own this shop");
    }
}
