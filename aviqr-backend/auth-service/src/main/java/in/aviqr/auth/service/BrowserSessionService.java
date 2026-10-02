package in.aviqr.auth.service;
import in.aviqr.auth.dto.AuthResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.util.*;
@Service
public class BrowserSessionService {
    @Value("${app.cookies.secure:true}") private boolean secure;
    @Value("${app.browser.origins:http://localhost:5173,http://localhost:5174,http://localhost:3000}") private String origins;
    public boolean browser(HttpServletRequest req) { return req.getHeader("Origin")!=null || "WEB".equalsIgnoreCase(req.getHeader("X-Platform")); }
    public String audience(HttpServletRequest req) { return "customer".equals(req.getHeader("X-Auth-Audience")) ? "customer" : "staff"; }
    public String cookie(HttpServletRequest req,String name) {
        if (req.getCookies()!=null) for (var cookie : req.getCookies()) if (name.equals(cookie.getName())) return cookie.getValue();
        return null;
    }
    public String refreshCookie(HttpServletRequest req) { return cookie(req,"aviqr_refresh_"+audience(req)); }
    public void requireBrowserCsrf(HttpServletRequest req) {
        if (!browser(req) && refreshCookie(req)==null) return;
        String origin = req.getHeader("Origin");
        boolean allowed = origin!=null && Arrays.stream(origins.split(",")).map(String::trim).anyMatch(origin::equals);
        if (!allowed || !"1".equals(req.getHeader("X-CSRF-Protection")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Browser origin and CSRF header required");
    }
    private String serializeCookie(String name,String value,long seconds) {
        return ResponseCookie.from(name,value).httpOnly(true).secure(secure).sameSite("Lax")
            .path("/api/v1/auth").maxAge(Duration.ofSeconds(seconds)).build().toString();
    }
    public HttpHeaders issue(AuthResponse data,HttpServletRequest req) {
        var headers = new HttpHeaders();
        headers.setCacheControl("no-store");
        headers.setPragma("no-cache");
        if (browser(req)) {
            requireBrowserCsrf(req);
            if (data.getRefreshToken()!=null) {
                headers.add(HttpHeaders.SET_COOKIE,serializeCookie("aviqr_refresh_"+audience(req),data.getRefreshToken(),604800));
                data.setRefreshToken(null);
            }
            if (data.getTrustedDeviceToken()!=null) {
                headers.add(HttpHeaders.SET_COOKIE,serializeCookie("aviqr_trusted_device",data.getTrustedDeviceToken(),2592000));
                data.setTrustedDeviceToken(null);
            }
        }
        return headers;
    }
    public HttpHeaders clear(HttpServletRequest req) {
        var headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE,serializeCookie("aviqr_refresh_"+audience(req),"",0));
        return headers;
    }
}
