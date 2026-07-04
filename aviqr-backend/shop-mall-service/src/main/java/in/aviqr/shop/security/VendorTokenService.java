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
 * Mints short-lived, vendor-scoped JWTs. Same problem and same fix as hotel-service's
 * OutletTokenService: a MALL-role login JWT has no shopId, so it gets 403'd by every
 * shop/order/menu/report/qr/payment-service endpoint that authorizes against X-Shop-Id
 * (e.g. report-service's per-vendor revenue used by the Mall dashboard's Reports tab).
 *
 * Once mall-service has verified the caller actually admins the vendor's mall, it can mint
 * a token carrying that vendor's real shopId — signed with the same shared secret every
 * service already trusts — so downstream calls behave as if the caller were that shop's
 * own MANAGER. Same trust boundary as a normal login, just scoped to one vendor and
 * short-lived.
 */
@Service
public class VendorTokenService {

    @Value("${app.jwt.secret}")
    private String secret;

    private static final long VENDOR_TOKEN_TTL_MS = 4 * 60 * 60 * 1000L; // 4 hours

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String mintVendorToken(String userId, String shopId) {
        return Jwts.builder()
                .subject(userId)
                .claims(Map.of(
                        "role",   "MANAGER",
                        "shopId", shopId
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + VENDOR_TOKEN_TTL_MS))
                .signWith(key())
                .compact();
    }
}
