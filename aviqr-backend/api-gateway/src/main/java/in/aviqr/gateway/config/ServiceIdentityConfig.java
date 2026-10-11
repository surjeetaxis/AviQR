package in.aviqr.gateway.config;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
@Configuration public class ServiceIdentityConfig {
 @Bean public in.aviqr.identity.ServiceIdentity serviceIdentity(Environment e){return new in.aviqr.identity.ServiceIdentity("api-gateway",e.getProperty("SERVICE_SIGNING_KEY_ID","v1"),e.getProperty("SERVICE_SIGNING_PRIVATE_KEY",""),e.getProperty("SERVICE_SIGNING_PUBLIC_KEYS","{}"),e.getProperty("SERVICE_ALLOWED_CALLERS","auth-service"),e.getProperty("app.service-signed-auth-required",Boolean.class,e.getProperty("SERVICE_SIGNED_AUTH_REQUIRED",Boolean.class,false)));}
}
