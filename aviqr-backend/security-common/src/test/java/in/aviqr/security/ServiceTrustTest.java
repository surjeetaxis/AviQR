package in.aviqr.security;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.assertj.core.api.Assertions.*;
class ServiceTrustTest {
    private static final String SECRET="a-test-only-internal-secret-with-32-characters";
    @Test void directlyForgedRoleHeaderIsRejected() throws Exception {
        var filter=new ServiceTrustConfiguration().serviceTrustFilter(new MockEnvironment().withProperty("INTERNAL_SYNC_SECRET",SECRET),new in.aviqr.identity.ServiceIdentity("test","v1","","{}","api-gateway",false)).getFilter();
        var request=new MockHttpServletRequest("GET","/api/v1/auth/admin/users");request.addHeader("X-User-Role","ADMIN");
        var response=new MockHttpServletResponse();var called=new AtomicBoolean();filter.doFilter(request,response,(req,res)->called.set(true));
        assertThat(called.get()).isFalse();assertThat(response.getStatus()).isEqualTo(401);assertThat(request.getAttribute("aviqr.authenticatedService")).isNull();
    }
    @Test void internalApiRejectsEvenGatewayCredential() throws Exception {
        var filter=new ServiceTrustConfiguration().serviceTrustFilter(new MockEnvironment().withProperty("INTERNAL_SYNC_SECRET",SECRET),new in.aviqr.identity.ServiceIdentity("test","v1","","{}","api-gateway",false)).getFilter();
        var request=new MockHttpServletRequest("POST","/api/v1/auth/internal/impersonation-token");request.addHeader("X-Gateway-Secret",SECRET);
        var response=new MockHttpServletResponse();var called=new AtomicBoolean();filter.doFilter(request,response,(req,res)->called.set(true));
        assertThat(called.get()).isFalse();assertThat(response.getStatus()).isEqualTo(401);assertThat(request.getAttribute("aviqr.authenticatedService")).isNull();
    }
    @Test void configuredInternalCredentialIsAccepted() throws Exception {
        var filter=new ServiceTrustConfiguration().serviceTrustFilter(new MockEnvironment().withProperty("INTERNAL_SYNC_SECRET",SECRET),new in.aviqr.identity.ServiceIdentity("test","v1","","{}","api-gateway",false)).getFilter();
        var request=new MockHttpServletRequest("POST","/api/v1/auth/internal/validate-session");request.addHeader("X-Internal-Secret",SECRET);
        var response=new MockHttpServletResponse();var called=new AtomicBoolean();filter.doFilter(request,response,(req,res)->called.set(true));assertThat(called.get()).isTrue();assertThat(request.getAttribute("aviqr.authenticatedService")).isEqualTo(Boolean.TRUE);
    }
    @Test void blankOrWeakCredentialPreventsStartup() {
        assertThatThrownBy(()->new ServiceTrustConfiguration().serviceTrustFilter(new MockEnvironment(),new in.aviqr.identity.ServiceIdentity("test","v1","","{}","api-gateway",false))).hasMessageContaining("32");
        assertThat(ServiceTrustConfiguration.matches("","" )).isFalse();
    }
}
