package in.aviqr.auth.service;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.dto.DeviceInfo;
import in.aviqr.auth.repository.*;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class PasskeyService implements CredentialRepository {
 private final PasskeyRepository credentials;
 private final PasskeyCeremonyRepository ceremonies;
 private final UserRepository users;
 private final StepUpService stepUp;
 private final LoginSecurityService security;
 private final ObjectMapper json;
 @Value("${app.passkeys.rp-id:localhost}") private String rpId;
 @Value("${app.passkeys.origins:http://localhost:5173,http://localhost:4179}") private String origins;
 private ByteArray handle(UUID uid){return new ByteArray(uid.toString().getBytes(StandardCharsets.UTF_8));}
 private RelyingParty rp(){return RelyingParty.builder().identity(RelyingPartyIdentity.builder().id(rpId).name("AviQR").build())
  .credentialRepository(this).origins(Set.copyOf(Arrays.stream(origins.split(",")).map(String::trim).filter(s->!s.isBlank()).toList())).build();}
 private User user(UUID uid,UUID sid){var user=stepUp.current(uid,sid);if(!LoginSecurityService.privileged(user))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Passkeys are available for admin and support accounts");return user;}
 private Map<String,Object> options(User user,UUID sid,String kind,String action,String stored,String client) throws Exception {
  var c=ceremonies.save(PasskeyCeremony.builder().userId(user.getId()).sessionId(sid).kind(kind).action(action).optionsJson(stored).expiresAt(LocalDateTime.now().plusMinutes(3)).build());
  return Map.of("ceremonyId",c.getId(),"options",json.readTree(client));
 }
 private PasskeyCeremony ceremony(UUID uid,UUID sid,UUID id,String kind){return ceremonies.findByIdAndUserIdAndSessionIdAndUsedFalse(id,uid,sid)
  .filter(c->kind.equals(c.getKind()) && c.getExpiresAt().isAfter(LocalDateTime.now()))
  .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Passkey verification expired or already used"));}
 @Transactional public Map<String,Object> registrationOptions(UUID uid,UUID sid) throws Exception {
  var user=user(uid,sid);
  if(credentials.findByUserIdAndActiveTrue(uid).size()>=10)throw new ResponseStatusException(HttpStatus.CONFLICT,"Maximum ten passkeys per account");
  var options=rp().startRegistration(StartRegistrationOptions.builder().user(UserIdentity.builder().name(user.getEmail()).displayName(user.getName()).id(handle(uid)).build())
   .authenticatorSelection(AuthenticatorSelectionCriteria.builder().residentKey(ResidentKeyRequirement.PREFERRED).userVerification(UserVerificationRequirement.REQUIRED).build()).timeout(120000L).build());
  return options(user,sid,"REGISTER",null,options.toJson(),options.toCredentialsCreateJson());
 }
 @Transactional public void register(UUID uid,UUID sid,UUID id,String response,String name,DeviceInfo device) {
  var user=user(uid,sid);var ceremony=ceremony(uid,sid,id,"REGISTER");
  try {
   var result=rp().finishRegistration(FinishRegistrationOptions.builder().request(PublicKeyCredentialCreationOptions.fromJson(ceremony.getOptionsJson()))
    .response(PublicKeyCredential.parseRegistrationResponseJson(response)).build());
   credentials.save(PasskeyCredential.builder().userId(uid).credentialId(result.getKeyId().getId().getBase64Url()).publicKeyCose(result.getPublicKeyCose().getBase64Url())
    .signatureCount(result.getSignatureCount()).name(name).createdAt(LocalDateTime.now()).build());
   ceremony.setUsed(true);ceremonies.save(ceremony);
   security.event(user.getEmail(),"PASSKEY_REGISTERED","COMPLETED","Passkey added",device,uid.toString());
  }catch(Exception e){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Passkey registration could not be verified");}
 }
 @Transactional public Map<String,Object> assertionOptions(UUID uid,UUID sid,String method,String target) throws Exception {
  var user=user(uid,sid);var action=stepUp.action(method,target);
  if(credentials.findByUserIdAndActiveTrue(uid).isEmpty())throw new ResponseStatusException(HttpStatus.CONFLICT,"Register a passkey in Account Security first");
  var options=rp().startAssertion(StartAssertionOptions.builder().userHandle(handle(uid)).userVerification(UserVerificationRequirement.REQUIRED).timeout(120000L).build());
  return options(user,sid,"ASSERT",action,options.toJson(),options.toCredentialsGetJson());
 }
 @Transactional public String assertCredential(UUID uid,UUID sid,UUID id,String response,DeviceInfo device) {
  var user=user(uid,sid);security.checkBlocked(user.getEmail(),device);var ceremony=ceremony(uid,sid,id,"ASSERT");
  try {
   var result=rp().finishAssertion(FinishAssertionOptions.builder().request(AssertionRequest.fromJson(ceremony.getOptionsJson()))
    .response(PublicKeyCredential.parseAssertionResponseJson(response)).build());
   if(!result.isSuccess() || !result.getUsername().equals(user.getEmail()))throw new IllegalArgumentException();
   var credential=credentials.findByCredentialIdAndActiveTrue(result.getCredentialId().getBase64Url()).filter(c->uid.equals(c.getUserId())).orElseThrow();
   credential.setSignatureCount(result.getSignatureCount());credential.setLastUsedAt(LocalDateTime.now());credentials.save(credential);
   ceremony.setUsed(true);ceremonies.save(ceremony);
   return stepUp.grant(user,sid,ceremony.getAction(),device,"PASSKEY");
  }catch(Exception e){security.event(user.getEmail(),"LOGIN_FAILURE","FAILED","Invalid passkey verification",device,null);throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Passkey could not be verified");}
 }
 @Transactional public List<Map<String,Object>> list(UUID uid,UUID sid){user(uid,sid);return credentials.findByUserIdAndActiveTrue(uid).stream().map(c->{var m=new HashMap<String,Object>();m.put("id",c.getId());m.put("name",c.getName());m.put("createdAt",c.getCreatedAt());m.put("lastUsedAt",c.getLastUsedAt());return (Map<String,Object>)m;}).toList();}
 @Transactional public void revoke(UUID uid,UUID sid,UUID id,DeviceInfo device){var user=user(uid,sid);var c=credentials.findByIdAndUserId(id,uid).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Passkey not found"));c.setActive(false);credentials.save(c);security.event(user.getEmail(),"PASSKEY_REVOKED","COMPLETED","Passkey removed",device,uid.toString());}
 @Override public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username){return users.findByEmail(username).map(u->credentials.findByUserIdAndActiveTrue(u.getId()).stream().map(c->PublicKeyCredentialDescriptor.builder().id(decode(c.getCredentialId())).build()).collect(java.util.stream.Collectors.toSet())).orElse(Set.of());}
 @Override public Optional<ByteArray> getUserHandleForUsername(String name){return users.findByEmail(name).map(u->handle(u.getId()));}
 @Override public Optional<String> getUsernameForUserHandle(ByteArray handle){try{return users.findById(UUID.fromString(new String(handle.getBytes(),StandardCharsets.UTF_8))).map(User::getEmail);}catch(Exception e){return Optional.empty();}}
 private ByteArray decode(String s){try{return ByteArray.fromBase64Url(s);}catch(Exception e){throw new IllegalArgumentException("Invalid stored credential",e);}}
 private RegisteredCredential registered(PasskeyCredential c){return RegisteredCredential.builder().credentialId(decode(c.getCredentialId())).userHandle(handle(c.getUserId())).publicKeyCose(decode(c.getPublicKeyCose())).signatureCount(c.getSignatureCount()).build();}
 @Override public Optional<RegisteredCredential> lookup(ByteArray id,ByteArray handle){return credentials.findByCredentialIdAndActiveTrue(id.getBase64Url()).filter(c->handle(c.getUserId()).equals(handle)).map(this::registered);}
 @Override public Set<RegisteredCredential> lookupAll(ByteArray id){return credentials.findByCredentialIdAndActiveTrue(id.getBase64Url()).map(c->Set.of(registered(c))).orElse(Set.of());}
}
