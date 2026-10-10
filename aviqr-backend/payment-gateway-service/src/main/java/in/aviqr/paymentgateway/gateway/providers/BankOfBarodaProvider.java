package in.aviqr.paymentgateway.gateway.providers;

import com.fss.plugin.bob.iPayPipe;
import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/** Bank of Baroda through the FSS iPayPipe plug-in (legacy BoBManager). The plug-in reads the
 *  merchant's resource.cgn and keystore.bin from a folder, so the hotel uploads both and they
 *  are written to a private temporary folder for each call. */
@Component
public class BankOfBarodaProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.BOB; }
    public String label() { return "Bank of Baroda"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("alias", "Terminal alias"), CredentialField.optional("merchantName", "Merchant name", null, null),
            CredentialField.file("resourceFile", "resource.cgn (base64)", "The resource.cgn file from the bank, base64-encoded"),
            CredentialField.file("keystoreFile", "keystore.bin (base64)", "The keystore.bin file from the bank, base64-encoded"));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        Path dir = files(ctx);
        try {
            iPayPipe pipe = pipe(ctx, dir);
            pipe.setAction("1"); // purchase
            pipe.setCurrency(Money.numeric(ctx.currency()));
            pipe.setLanguage("840"); // as the legacy BoBManager sent it
            pipe.setResponseURL(ctx.callbackUrl());
            pipe.setErrorURL(ctx.callbackUrl());
            pipe.setAmt(Money.major(ctx.amount(), ctx.currency()));
            pipe.setTransId(ctx.reference());
            pipe.setTrackId(ctx.reference());
            pipe.setUdf6(ctx.credentials().get("merchantName", "Hotel"));
            pipe.setUdf7(Objects.toString(ctx.guestName(), ""));
            pipe.setUdf8(ctx.email());
            pipe.setUdf9(ctx.phoneDigits());
            pipe.setUdf11(Money.major(ctx.amount(), ctx.currency()));
            pipe.setUdf12(ctx.reference());
            if (pipe.performPaymentInitializationHTTP() != 0 || pipe.getWebAddress() == null)
                throw new GatewayException("Bank of Baroda: " + Objects.toString(pipe.getError(), "could not start payment"));
            return Checkout.redirect(pipe.getWebAddress());
        } finally {
            clean(dir);
        }
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) throws Exception {
        String trandata = p.get("trandata");
        if (trandata == null) return Outcome.failed(Objects.toString(p.get("ErrorText"), "Payment was not completed"));
        Path dir = files(ctx);
        try {
            iPayPipe pipe = pipe(ctx, dir);
            if (pipe.parseEncryptedRequest(trandata) != 0) return Outcome.unverified(null, "Response could not be decrypted");
            if (!ctx.reference().equals(pipe.getTrackId())) return Outcome.failed("Unknown Bank of Baroda transaction");
            String result = Objects.toString(pipe.getResult(), "");
            if (p.get("ErrorText") != null || !(result.equalsIgnoreCase("CAPTURED") || result.equalsIgnoreCase("SUCCESS")))
                return Outcome.failed(pipe.getPaymentId(), "Bank result " + result);
            return Outcome.paid(pipe.getPaymentId(), pipe.getRef(), Money.parse(pipe.getAmt()));
        } finally {
            clean(dir);
        }
    }

    private static iPayPipe pipe(GatewayContext ctx, Path dir) {
        iPayPipe pipe = new iPayPipe();
        pipe.setResourcePath(dir.toString() + "/");
        pipe.setKeystorePath(dir.toString() + "/");
        pipe.setAlias(ctx.credentials().require("alias"));
        return pipe;
    }

    private static Path files(GatewayContext ctx) throws Exception {
        Path dir = Files.createTempDirectory("bob-");
        Files.write(dir.resolve("resource.cgn"), Base64.getMimeDecoder().decode(ctx.credentials().require("resourceFile")));
        Files.write(dir.resolve("keystore.bin"), Base64.getMimeDecoder().decode(ctx.credentials().require("keystoreFile")));
        return dir;
    }

    private static void clean(Path dir) {
        try (var files = Files.list(dir)) {
            for (Path f : files.toList()) Files.deleteIfExists(f);
            Files.deleteIfExists(dir);
        } catch (Exception ignored) { }
    }
}
