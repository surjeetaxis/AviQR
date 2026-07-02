package in.aviqr.shop.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * Mints short-lived, shop-scoped JWTs. Same problem and same fix as hotel-service's
 * OutletTokenService and mall-service's VendorTokenService: a SUPPLIER-role login JWT
 * has no shopId (a supplier owns several shops, not one), so it gets 403'd by every
 * shop/order/menu/report/qr/payment-service endpoint that authorizes against X-Shop-Id
 * (e.g. report-service's per-outlet revenue used by the Supplier dashboard's Reports tab).
 *
 * Once shop-service has verified the caller actually owns the shop, it can mint a token
 * carrying that shop's real id — signed with the same shared secret every service already
 * trusts — so downstream calls behave as if the caller were that shop's own MANAGER. Same
 * trust boundary as a normal login, just scoped to one shop and short-lived.
 */
@Service
public class ShopTokenService {

    @Value("${app.jwt.secret}")
    private String secret;

    private static final long SHOP_TOKEN_TTL_MS = 4 * 60 * 60 * 1000L; // 4 hours

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String mintShopToken(String userId, String shopId) {
        return Jwts.builder()
                .subject(userId)
                .claims(Map.of(
                        "role",   "MANAGER",
                        "shopId", shopId
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + SHOP_TOKEN_TTL_MS))
                .signWith(key())
                .compact();
    }
}
