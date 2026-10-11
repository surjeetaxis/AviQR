package in.aviqr.auth.service;
import in.aviqr.auth.repository.LoginSecurityRepository;
import org.springframework.stereotype.Service;
import org.springframework.core.env.Environment;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
@Service
public class CaptchaService {
 private final LoginSecurityRepository records;private final ObjectMapper json;private final boolean enabled;private final String secret,siteKey;private final Set<String> hostnames;
 private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
 public CaptchaService(LoginSecurityRepository records,ObjectMapper json,Environment env){this.records=records;this.json=json;enabled=env.getProperty("app.captcha.enabled",Boolean.class,false);secret=env.getProperty("TURNSTILE_SECRET_KEY","");siteKey=env.getProperty("TURNSTILE_SITE_KEY","");hostnames=Set.copyOf(Arrays.stream(env.getProperty("TURNSTILE_HOSTNAMES","").split(",")).map(String::trim).filter(s->!s.isEmpty()).toList());if(enabled && (secret.isBlank() || !siteKey.matches("[a-zA-Z0-9_-]{10,100}") || hostnames.isEmpty()))throw new IllegalStateException("CAPTCHA requires Turnstile keys and an explicit hostname allowlist");}
 public String siteKey(){return siteKey;}
 public boolean required(String email,String ip){if(!enabled)return false;var after=LocalDateTime.now().minusHours(1);return records.countByEmailAndKindAndCreatedAtAfter((email==null?"":email.trim().toLowerCase(Locale.ROOT)),"LOGIN_FAILURE",after)>=3 || (ip!=null && records.countByIpAddressAndKindAndCreatedAtAfter(ip,"LOGIN_FAILURE",after)>=10);}
 public boolean verify(String token,String ip){if(token==null || token.isBlank() || token.length()>2048)return false;try{
  String form="secret="+URLEncoder.encode(secret,StandardCharsets.UTF_8)+"&response="+URLEncoder.encode(token,StandardCharsets.UTF_8)+"&remoteip="+URLEncoder.encode(ip==null?"":ip,StandardCharsets.UTF_8);
  var request=HttpRequest.newBuilder(URI.create("https://challenges.cloudflare.com/turnstile/v0/siteverify")).timeout(Duration.ofSeconds(5)).header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(form)).build();
  var response=client.send(request,HttpResponse.BodyHandlers.ofString());if(response.statusCode()!=200 || response.body().length()>8192)return false;var result=json.readTree(response.body());return result.path("success").asBoolean(false) && hostnames.contains(result.path("hostname").asText()) && "aviqr-security".equals(result.path("action").asText());
 }catch(Exception e){if(e instanceof InterruptedException)Thread.currentThread().interrupt();return false;}}
}
