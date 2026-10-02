package in.aviqr.auth.controller;
import in.aviqr.auth.service.PasskeyService;
import in.aviqr.auth.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/v1/auth/passkeys") @RequiredArgsConstructor
public class PasskeyController {
 private final PasskeyService passkeys;
 public record Target(@NotBlank String method,@NotBlank @Size(max=450) String target) {}
 public record Finish(@NotNull UUID ceremonyId,@NotBlank @Size(max=30000) String credential,@Size(min=1,max=100) String name) {}
 @GetMapping public ApiResponse<List<Map<String,Object>>> list(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid){return ApiResponse.ok(passkeys.list(uid,sid));}
 @PostMapping("/registration/options") public ApiResponse<Map<String,Object>> registrationOptions(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid) throws Exception{return ApiResponse.ok(passkeys.registrationOptions(uid,sid));}
 @PostMapping("/registration/finish") public ApiResponse<Void> register(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,@Valid @RequestBody Finish body,HttpServletRequest req){passkeys.register(uid,sid,body.ceremonyId(),body.credential(),body.name()==null?"Security key":body.name(),AccountSecurityController.device(req));return ApiResponse.ok("Passkey registered",null);}
 @PostMapping("/assertion/options") public ApiResponse<Map<String,Object>> assertionOptions(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,@Valid @RequestBody Target body) throws Exception{return ApiResponse.ok(passkeys.assertionOptions(uid,sid,body.method(),body.target()));}
 @PostMapping("/assertion/finish") public ApiResponse<Map<String,String>> assertionFinish(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,@Valid @RequestBody Finish body,HttpServletRequest req){return ApiResponse.ok(Map.of("token",passkeys.assertCredential(uid,sid,body.ceremonyId(),body.credential(),AccountSecurityController.device(req))));}
 @DeleteMapping("/{id}") public ApiResponse<Void> revoke(@RequestHeader("X-User-Id") UUID uid,@RequestHeader("X-Session-Id") UUID sid,@PathVariable UUID id,HttpServletRequest req){passkeys.revoke(uid,sid,id,AccountSecurityController.device(req));return ApiResponse.ok("Passkey revoked",null);}
}
