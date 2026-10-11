package in.aviqr.identity;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Ed25519 assertions bind service identity to method, target, body and forwarded identity. */
public final class ServiceIdentity {
 private final String issuer,keyId;private final PrivateKey privateKey;private final Map<String,PublicKey> publicKeys=new HashMap<>();
 private final Set<String> allowed;private final boolean required;
 private final ConcurrentHashMap<String,Long> seen=new ConcurrentHashMap<>();
 private final ObjectMapper json=new ObjectMapper();
 private static final List<String> IDENTITY_HEADERS=List.of("X-User-Id","X-User-Role","X-Shop-Id","X-Session-Id","X-User-Phone","X-Forwarded-For","Cookie","Origin","X-CSRF-Protection","X-Auth-Audience","X-Trusted-Device","X-Captcha-Token","X-Platform","X-Device-Id","X-Device-Model","X-App-Version");
 public ServiceIdentity(String issuer,String keyId,String privateValue,String publicValues,String allowedCallers,boolean required){
  this.issuer=issuer;this.keyId=keyId;this.required=required;this.allowed=Set.copyOf(Arrays.stream(allowedCallers.split(",")).map(String::trim).filter(s->!s.isEmpty()).toList());
  try{var factory=KeyFactory.getInstance("Ed25519");this.privateKey=privateValue.isBlank()?null:factory.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateValue)));
   Map<String,String> values=json.readValue(publicValues,new com.fasterxml.jackson.core.type.TypeReference<Map<String,String>>(){});
   for(var entry:values.entrySet())publicKeys.put(entry.getKey(),factory.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(entry.getValue()))));
  }catch(Exception e){throw new IllegalStateException("Invalid service signing key configuration",e);}
  if(required && (privateKey==null || publicKeys.isEmpty() || allowed.isEmpty()))throw new IllegalStateException("Required signed service authentication needs private/public keys and allowed callers");
 }
 public static List<String> boundHeaders(){return IDENTITY_HEADERS;}
 public boolean required(){return required;}
 private String digest(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(Exception e){throw new IllegalStateException(e);}}
 private String headers(Map<String,String> input){StringBuilder b=new StringBuilder();for(String h:IDENTITY_HEADERS)b.append(h).append(':').append(input.getOrDefault(h,"")).append('\n');return digest(b.toString().getBytes(StandardCharsets.UTF_8));}
 public String sign(String audience,String method,String target,byte[] body,Map<String,String> identity){
  if(privateKey==null)return null;
  try{String payload=Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(Map.of("iss",issuer,"kid",keyId,"aud",audience,"method",method,"target",target,"body",digest(body),"identity",headers(identity),"time",Instant.now().getEpochSecond(),"nonce",UUID.randomUUID().toString())));
   var signature=Signature.getInstance("Ed25519");signature.initSign(privateKey);signature.update(payload.getBytes(StandardCharsets.US_ASCII));return payload+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(signature.sign());
  }catch(Exception e){throw new IllegalStateException("Service assertion signing failed",e);}
 }
 public boolean verify(String token,String method,String target,byte[] body,Map<String,String> identity){
  if(token==null)return !required;
  try{if(token.length()>8000)return false;String[] parts=token.split("\\.",-1);if(parts.length!=2)return false;
   var payload=json.readTree(Base64.getUrlDecoder().decode(parts[0]));String caller=payload.path("iss").asText();var key=publicKeys.get(caller+"."+payload.path("kid").asText());
   if(key==null || !allowed.contains(caller))return false;
   var signature=Signature.getInstance("Ed25519");signature.initVerify(key);signature.update(parts[0].getBytes(StandardCharsets.US_ASCII));if(!signature.verify(Base64.getUrlDecoder().decode(parts[1])))return false;
   long now=Instant.now().getEpochSecond(),issued=payload.path("time").asLong(0);if(issued<now-30 || issued>now+5)return false;
   if(!issuer.equals(payload.path("aud").asText()) || !method.equals(payload.path("method").asText()) || !target.equals(payload.path("target").asText()) || !digest(body).equals(payload.path("body").asText()) || !headers(identity).equals(payload.path("identity").asText()))return false;
   seen.entrySet().removeIf(e->e.getValue()<now-35);if(seen.size()>10000)return false;
   return seen.putIfAbsent(caller+":"+payload.path("nonce").asText(),issued)==null;
  }catch(Exception e){return false;}
 }
}
