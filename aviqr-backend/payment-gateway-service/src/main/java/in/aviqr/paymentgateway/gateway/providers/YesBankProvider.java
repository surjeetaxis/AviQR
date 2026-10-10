package in.aviqr.paymentgateway.gateway.providers;

import com.isg.isgpay.ISGPayDecryption;
import com.isg.isgpay.ISGPayEncryption;
import in.aviqr.paymentgateway.gateway.*;
import org.springframework.stereotype.Component;

import java.util.*;

/** Yes Bank through ISGPay (legacy YesBankManager): the request is encrypted with the hotel's
 *  key and salt, and the response decrypts only with them and carries a validated hash. */
@Component
public class YesBankProvider implements GatewayProvider {
    public PaymentGateway gateway() { return PaymentGateway.YES_BANK; }
    public String label() { return "Yes Bank (ISGPay)"; }
    public Verification verification() { return Verification.SIGNED; }
    public List<CredentialField> credentialFields() {
        return List.of(CredentialField.text("merchantId", "Merchant code"), CredentialField.text("terminalId", "Terminal ID"),
            CredentialField.optional("bankId", "Bank ID", "000004", null), CredentialField.text("mcc", "MCC"),
            CredentialField.secret("accessCode", "Access code (PassCode)"), CredentialField.secret("encryptionKey", "Encryption key"),
            CredentialField.secret("salt", "Secure secret (salt)"));
    }

    public Checkout begin(GatewayContext ctx) throws Exception {
        Credentials c = ctx.credentials();
        LinkedHashMap<String, String> f = new LinkedHashMap<>();
        f.put("TxnRefNo", ctx.reference());
        f.put("Amount", Long.toString(Money.minor(ctx.amount(), ctx.currency())));
        f.put("Version", "1");
        f.put("PassCode", c.require("accessCode"));
        f.put("BankId", c.get("bankId", "000004"));
        f.put("TerminalId", c.require("terminalId"));
        f.put("MerchantId", c.require("merchantId"));
        f.put("MCC", c.require("mcc"));
        f.put("Currency", Money.numeric(ctx.currency()));
        f.put("TxnType", "Pay");
        f.put("ReturnURL", ctx.callbackUrl());
        f.put("OrderInfo", ctx.reference());
        f.put("Email", ctx.email());
        f.put("Phone", ctx.phoneDigits());
        f.put("FirstName", ctx.firstName());
        f.put("LastName", ctx.lastName());
        ISGPayEncryption enc = new ISGPayEncryption();
        enc.encrypt(f, c.require("encryptionKey"), c.require("salt"));
        Map<String, String> form = new LinkedHashMap<>();
        form.put("MerchantId", enc.getMERCHANT_ID());
        form.put("TerminalId", enc.getTERMINAL_ID());
        form.put("BankId", enc.getBANK_ID());
        form.put("Version", enc.getVERSION());
        form.put("EncData", enc.getENC_DATA());
        return Checkout.form(ctx.testMode() ? "https://sandbox.isgpay.com:8443/ISGPay/request.action" : "https://isgpay.com/ISGPay/request.action", form);
    }

    public Outcome complete(GatewayContext ctx, Map<String, String> p) throws Exception {
        LinkedHashMap<String, String> fields = new LinkedHashMap<>(p);
        new ISGPayDecryption().decrypt(fields, ctx.credentials().require("encryptionKey"), ctx.credentials().require("salt"));
        if (!ctx.reference().equals(fields.get("TxnRefNo"))) return Outcome.failed("Unknown Yes Bank transaction");
        boolean valid = "CORRECT".equals(fields.get("hashValidated"));
        if (!"00".equals(fields.get("ResponseCode"))) return Outcome.failed(fields.get("RetRefNo"), Objects.toString(fields.get("Message"), "Payment declined"));
        return Outcome.success(valid, fields.get("RetRefNo"), fields.get("AuthCode"), Money.fromMinor(fields.get("Amount"), ctx.currency()));
    }
}
