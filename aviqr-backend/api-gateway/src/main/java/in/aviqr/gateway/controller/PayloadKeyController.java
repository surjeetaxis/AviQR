package in.aviqr.gateway.controller;

import in.aviqr.gateway.security.PayloadEncryption;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PayloadKeyController {
    private final PayloadEncryption encryption;
    public PayloadKeyController(PayloadEncryption encryption) { this.encryption=encryption; }
    @GetMapping("/api/v1/security/payload-key")
    public Map<String,String> publicKey() { return encryption.publicConfig(); }
}
