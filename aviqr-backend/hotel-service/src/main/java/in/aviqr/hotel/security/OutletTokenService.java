package in.aviqr.hotel.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * Mints short-lived, outlet-scoped JWTs. The API gateway derives X-Shop-Id from the JWT's
 * shopId claim on every request (see AuthenticationFilter), which is always blank for a
 * HOTEL-role user's real login token — that's what blocks every shop-service/order-service/
 * menu-service/report-service/qr-service/payment-service endpoint that authorizes against
 * X-Shop-Id (Staff, Loyalty, Orders, Inventory, Reports, QR codes, Payments, ...).
 *
 * Once hotel-service has verified (via HotelAccessService.hasAccess) that the caller actually
 * manages the hotel/outlet, it can mint a token carrying that outlet's real shopId — signed
 * with the same shared secret every service already trusts — so downstream calls behave
 * exactly as if the caller were that shop's own MANAGER. Same trust boundary as a normal
 * login, just scoped to one outlet and short-lived.
 */
@Service
public class OutletTokenService {

    @Value("${app.jwt.secret}")
    private String secret;

    private static final long OUTLET_TOKEN_TTL_MS = 4 * 60 * 60 * 1000L; // 4 hours

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String mintOutletToken(String userId, String shopId) {
        return Jwts.builder()
                .subject(userId)
                .claims(Map.of(
                        "role",   "MANAGER",
                        "shopId", shopId
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + OUTLET_TOKEN_TTL_MS))
                .signWith(key())
                .compact();
    }
}
