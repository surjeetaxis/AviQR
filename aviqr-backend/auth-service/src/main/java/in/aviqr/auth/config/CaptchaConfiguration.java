package in.aviqr.auth.config;
import in.aviqr.auth.service.CaptchaService;
import in.aviqr.auth.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.*;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import java.util.*;
@Configuration
public class CaptchaConfiguration {
 @Bean public FilterRegistrationBean<OncePerRequestFilter> captchaFilter(CaptchaService captcha,UserRepository users,ObjectMapper json){
  var filter=new OncePerRequestFilter(){protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws ServletException,IOException{
   if(!"POST".equals(request.getMethod()) || !Set.of("/api/v1/auth/login","/api/v1/auth/otp/login","/api/v1/auth/otp/send","/api/v1/auth/forgot-password","/api/v1/auth/reset-password","/api/v1/auth/security/step-up/start","/api/v1/auth/security/step-up/finish").contains(request.getRequestURI())){chain.doFilter(request,response);return;}
   byte[] body=request.getInputStream().readNBytes(8193);if(body.length>8192){response.sendError(413);return;}
   String email=request.getParameter("email");try{if(body.length>0)email=json.readTree(body).path("email").asText(email);}catch(Exception ignored){}
   if(request.getRequestURI().contains("/security/step-up/") && request.getHeader("X-User-Id")!=null)try{email=users.findById(UUID.fromString(request.getHeader("X-User-Id"))).map(u->u.getEmail()).orElse(email);}catch(Exception ignored){}
   String ip=request.getHeader("X-Forwarded-For");if(ip==null || ip.isBlank())ip=request.getRemoteAddr();else ip=ip.split(",")[0].trim();
   if(captcha.required(email,ip) && !captcha.verify(request.getHeader("X-Captcha-Token"),ip)){response.setStatus(403);response.setContentType("application/json");json.writeValue(response.getOutputStream(),Map.of("success",false,"message","Complete the security challenge to continue","captchaRequired",true,"siteKey",captcha.siteKey()));return;}
   chain.doFilter(new HttpServletRequestWrapper(request){public ServletInputStream getInputStream(){var input=new ByteArrayInputStream(body);return new ServletInputStream(){public int read(){return input.read();}public boolean isFinished(){return input.available()==0;}public boolean isReady(){return true;}public void setReadListener(ReadListener listener){throw new UnsupportedOperationException();}};}public BufferedReader getReader(){return new BufferedReader(new InputStreamReader(getInputStream(),java.nio.charset.StandardCharsets.UTF_8));}},response);
  }};var registration=new FilterRegistrationBean<OncePerRequestFilter>(filter);registration.setOrder(-190);return registration;
 }
}
