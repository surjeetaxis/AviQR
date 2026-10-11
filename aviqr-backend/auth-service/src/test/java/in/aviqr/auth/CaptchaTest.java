package in.aviqr.auth;
import in.aviqr.auth.service.CaptchaService;
import in.aviqr.auth.config.CaptchaConfiguration;
import in.aviqr.auth.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class CaptchaTest {
 private MockEnvironment enabled(){return new MockEnvironment().withProperty("app.captcha.enabled","true").withProperty("TURNSTILE_SECRET_KEY","test-server-secret").withProperty("TURNSTILE_SITE_KEY","test-sitekey-123456").withProperty("TURNSTILE_HOSTNAMES","aviqr.com");}
 @Test void disabledProviderDoesNotInterruptLogin(){var records=mock(LoginSecurityRepository.class);var captcha=new CaptchaService(records,new ObjectMapper(),new MockEnvironment());assertThat(captcha.required("a@example.com","198.51.100.1")).isFalse();verifyNoInteractions(records);}
 @Test void thresholdAppliesToNormalizedAccountAndIp(){var records=mock(LoginSecurityRepository.class);var captcha=new CaptchaService(records,new ObjectMapper(),enabled());when(records.countByEmailAndKindAndCreatedAtAfter(eq("a@example.com"),eq("LOGIN_FAILURE"),any())).thenReturn(3L);assertThat(captcha.required(" A@example.com ","198.51.100.1")).isTrue();when(records.countByIpAddressAndKindAndCreatedAtAfter(eq("198.51.100.1"),eq("LOGIN_FAILURE"),any())).thenReturn(10L);assertThat(captcha.required("b@example.com","198.51.100.1")).isTrue();assertThat(captcha.required("b@example.com","198.51.100.2")).isFalse();}
 @Test void missingProviderConfigurationFailsClosed(){assertThatThrownBy(()->new CaptchaService(mock(LoginSecurityRepository.class),new ObjectMapper(),new MockEnvironment().withProperty("app.captcha.enabled","true"))).isInstanceOf(IllegalStateException.class);}
 @Test void invalidProofDoesNotReachCredentialValidation()throws Exception{
  var captcha=mock(CaptchaService.class);when(captcha.required(any(),any())).thenReturn(true);when(captcha.siteKey()).thenReturn("test-sitekey-123456");
  var filter=new CaptchaConfiguration().captchaFilter(captcha,mock(UserRepository.class),new ObjectMapper()).getFilter();var request=new MockHttpServletRequest("POST","/api/v1/auth/login");request.setContent("{\"email\":\"a@example.com\",\"password\":\"secret\"}".getBytes());
  var response=new MockHttpServletResponse();var called=new AtomicBoolean();filter.doFilter(request,response,(req,res)->called.set(true));assertThat(called.get()).isFalse();assertThat(response.getStatus()).isEqualTo(403);assertThat(response.getContentAsString()).contains("captchaRequired").doesNotContain("secret");
 }
 @Test void validProofPreservesRequestBody()throws Exception{
  var captcha=mock(CaptchaService.class);when(captcha.required(any(),any())).thenReturn(true);when(captcha.verify(eq("proof"),any())).thenReturn(true);
  var filter=new CaptchaConfiguration().captchaFilter(captcha,mock(UserRepository.class),new ObjectMapper()).getFilter();var request=new MockHttpServletRequest("POST","/api/v1/auth/login");String body="{\"email\":\"a@example.com\",\"password\":\"secret\"}";request.setContent(body.getBytes());request.addHeader("X-Captcha-Token","proof");
  var called=new AtomicBoolean();filter.doFilter(request,new MockHttpServletResponse(),(req,res)->{assertThat(new String(req.getInputStream().readAllBytes())).isEqualTo(body);called.set(true);});assertThat(called.get()).isTrue();
 }
}
