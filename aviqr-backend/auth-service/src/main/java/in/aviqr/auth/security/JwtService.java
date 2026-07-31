package in.aviqr.auth.security;

import in.aviqr.auth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service @Slf4j
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    @Value("${app.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(User user) {
        return generateAccessToken(user, Map.of(), expirationMs);
    }

    // Used for impersonation tokens: carries an "impersonatedBy" claim and a
    // shorter, distinct expiry so a support-minted session for a target user
    // can't outlive a normal login and is identifiable in the token itself.
    public String generateAccessToken(User user, Map<String, Object> extraClaims, long customExpirationMs) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role",   user.getRole().name());
        claims.put("email",  user.getEmail());
        claims.put("name",   user.getName());
        claims.put("shopId", user.getShopId() != null ? user.getShopId() : "");
        claims.put("phone",  user.getPhone() != null ? user.getPhone() : "");
        claims.putAll(extraClaims);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claims(claims)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + customExpirationMs))
                .signWith(key())
                .compact();
    }

    public String generateRefreshToken(UUID userId) {
        return Jwts.builder()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshExpirationMs))
                .signWith(key())
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload();
    }

    public boolean isTokenValid(String token) {
        try { extractClaims(token); return true; }
        catch (Exception e) { return false; }
    }

    public long getExpirationMs() { return expirationMs; }
    public long getRefreshExpirationMs() { return refreshExpirationMs; }
}
