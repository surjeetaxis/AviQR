package in.aviqr.auth;
import in.aviqr.auth.dto.AuthResponse;
import in.aviqr.auth.service.BrowserSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.http.HttpHeaders;
import static org.assertj.core.api.Assertions.*;
class BrowserSessionTest {
    private BrowserSessionService service() {
        var service=new BrowserSessionService();ReflectionTestUtils.setField(service,"secure",true);
        ReflectionTestUtils.setField(service,"origins","https://aviqr.com");return service;
    }
    @Test void webRefreshCredentialOnlyAppearsInSecureHttpOnlyCookie() {
        var request=new MockHttpServletRequest();request.addHeader("Origin","https://aviqr.com");
        request.addHeader("X-CSRF-Protection","1");request.addHeader("X-Auth-Audience","customer");
        var data=AuthResponse.builder().accessToken("access").refreshToken("refresh").trustedDeviceToken("device").build();
        var headers=service().issue(data,request);
        assertThat(data.getRefreshToken()).isNull();assertThat(data.getTrustedDeviceToken()).isNull();
        assertThat(headers.get(HttpHeaders.SET_COOKIE)).allMatch(cookie->cookie.contains("HttpOnly") && cookie.contains("Secure") && cookie.contains("SameSite=Lax"));
        assertThat(headers.getFirst(HttpHeaders.SET_COOKIE)).contains("aviqr_refresh_customer=refresh");
        assertThat(headers.getCacheControl()).isEqualTo("no-store");
    }
    @Test void hostileOriginCannotUseBrowserCookiesEvenWithCsrfHeader() {
        var request=new MockHttpServletRequest();request.addHeader("Origin","https://attacker.example");request.addHeader("X-CSRF-Protection","1");
        assertThatThrownBy(()->service().requireBrowserCsrf(request)).hasMessageContaining("CSRF");
    }
    @Test void nativeClientsRetainRefreshCredentialForSecureStore() {
        var data=AuthResponse.builder().refreshToken("refresh").build();var headers=service().issue(data,new MockHttpServletRequest());
        assertThat(data.getRefreshToken()).isEqualTo("refresh");assertThat(headers.get(HttpHeaders.SET_COOKIE)).isNull();
    }
}
