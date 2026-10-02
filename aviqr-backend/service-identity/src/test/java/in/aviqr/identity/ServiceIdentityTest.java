package in.aviqr.identity;
import org.junit.jupiter.api.*;
import java.security.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class ServiceIdentityTest {
 private KeyPair gateway,orders;
 private String publicKeys;
 private ServiceIdentity sender,receiver;
 @BeforeEach void setup() throws Exception {
  gateway=KeyPairGenerator.getInstance("Ed25519").generateKeyPair();orders=KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
  publicKeys="{\"api-gateway.v1\":\""+Base64.getEncoder().encodeToString(gateway.getPublic().getEncoded())+"\",\"order-qr-service.v1\":\""+Base64.getEncoder().encodeToString(orders.getPublic().getEncoded())+"\"}";
  sender=identity("api-gateway",gateway,"order-qr-service");receiver=identity("order-qr-service",orders,"api-gateway");
 }
 private ServiceIdentity identity(String name,KeyPair key,String allowed){return new ServiceIdentity(name,"v1",Base64.getEncoder().encodeToString(key.getPrivate().getEncoded()),publicKeys,allowed,true);}
 @Test void authenticatedRequestIsSingleUse(){var token=sender.sign("order-qr-service","POST","/api/v1/orders",new byte[]{1},Map.of("X-User-Id","alice"));assertThat(receiver.verify(token,"POST","/api/v1/orders",new byte[]{1},Map.of("X-User-Id","alice"))).isTrue();assertThat(receiver.verify(token,"POST","/api/v1/orders",new byte[]{1},Map.of("X-User-Id","alice"))).isFalse();}
 @Test void rejectsChangedBodyIdentityPathMethodAndAudience(){var token=sender.sign("order-qr-service","POST","/api/v1/orders?a=1",new byte[]{1},Map.of("X-User-Role","OWNER"));assertThat(receiver.verify(token,"POST","/api/v1/orders?a=1",new byte[]{2},Map.of("X-User-Role","OWNER"))).isFalse();assertThat(receiver.verify(token,"POST","/api/v1/orders?a=1",new byte[]{1},Map.of("X-User-Role","ADMIN"))).isFalse();assertThat(receiver.verify(token,"POST","/api/v1/orders?a=2",new byte[]{1},Map.of("X-User-Role","OWNER"))).isFalse();assertThat(receiver.verify(token,"DELETE","/api/v1/orders?a=1",new byte[]{1},Map.of("X-User-Role","OWNER"))).isFalse();assertThat(sender.verify(token,"POST","/api/v1/orders?a=1",new byte[]{1},Map.of("X-User-Role","OWNER"))).isFalse();}
 @Test void missingUnknownAndCorruptAssertionsFailClosed(){assertThat(receiver.verify(null,"GET","/",new byte[0],Map.of())).isFalse();assertThat(receiver.verify("broken","GET","/",new byte[0],Map.of())).isFalse();var impostor=identity("api-gateway",orders,"order-qr-service");assertThat(receiver.verify(impostor.sign("order-qr-service","GET","/",new byte[0],Map.of()),"GET","/",new byte[0],Map.of())).isFalse();}
 @Test void callersMustBeExplicitlyAllowed(){var restricted=identity("order-qr-service",orders,"payment-service");assertThat(restricted.verify(sender.sign("order-qr-service","GET","/",new byte[0],Map.of()),"GET","/",new byte[0],Map.of())).isFalse();}
 @Test void requiredModeRefusesIncompleteConfiguration(){assertThatThrownBy(()->new ServiceIdentity("gateway","v1","","{}","auth-service",true)).isInstanceOf(IllegalStateException.class);}
}
