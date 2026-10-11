package in.aviqr.paymentgateway.gateway.providers;

import com.asiapay.secure.SHAPaydollarSecure;
import com.paygate.ag.common.utils.PayGateCryptoUtils;
import com.paytm.pg.merchant.PaytmChecksum;
import in.aviqr.paymentgateway.gateway.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.*;

import static org.assertj.core.api.Assertions.*;

/** Each gateway's request signing and response checking, with forged and tampered responses. */
class ProviderSignatureTest {
    static GatewayContext ctx(Map<String, String> creds) { return ctx(creds, "INR"); }
    static GatewayContext ctx(Map<String, String> creds, String currency) {
        return new GatewayContext(UUID.randomUUID(), UUID.randomUUID(), "AQTESTREF000000001", new BigDecimal("1500.50"), currency, "Deposit",
            "Asha Rao", "asha@example.com", "+91 98765 43210", "https://api.example/cb/1", "https://api.example/notify/x", true,
            new Credentials(creds), new HashMap<>());
    }

    @Test
    void money() {
        assertThat(Money.minor(new BigDecimal("1500.5"), "INR")).isEqualTo(150050);
        assertThat(Money.minor12(new BigDecimal("1500.5"), "INR")).isEqualTo("000000150050");
        assertThat(Money.minor(new BigDecimal("1500"), "JPY")).isEqualTo(1500);
        assertThat(Money.numeric("MVR")).isEqualTo("462");
        assertThat(Money.major(new BigDecimal("12"), "USD")).isEqualTo("12.00");
    }

    @Test
    void bmlSignsAndChecksResponses() {
        var c = ctx(Map.of("merchantId", "9800000001", "acquirerId", "407387", "password", "pw"), "MVR");
        var f = new BmlProvider().begin(c).fields();
        assertThat(f.get("Signature")).isEqualTo(FacMpi.signature("pw9800000001407387AQTESTREF000000001000000150050462"));
        assertThat(FacMpi.signature("abc")).isEqualTo("qZk+NkcGgWq6PiVxeFDCbJzQ2J0="); // SHA-1, as the MPI spec defines it
        Map<String, String> resp = new HashMap<>(Map.of("MerID", "9800000001", "AcqID", "407387", "OrderID", c.reference(),
            "ResponseCode", "1", "ReasonCode", "1", "ReferenceNo", "R1"));
        resp.put("Signature", FacMpi.signature("pw9800000001407387" + c.reference() + "11"));
        assertThat(new BmlProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.PAID);
        resp.put("Signature", "forged");
        assertThat(new BmlProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void migsHashesBothWays() {
        var c = ctx(Map.of("merchantId", "M1", "accessCode", "A1", "hashSecret", "00112233445566778899AABBCCDDEEFF"));
        assertThat(new MigsProvider().begin(c).url()).contains("vpc_SecureHash=").contains("vpc_Amount=150050");
        Map<String, String> resp = new TreeMap<>(Map.of("vpc_MerchTxnRef", c.reference(), "vpc_TxnResponseCode", "0", "vpc_Amount", "150050",
            "vpc_TransactionNo", "77", "vpc_Message", "Approved"));
        resp.put("vpc_SecureHash", MigsProvider.hash("00112233445566778899AABBCCDDEEFF", resp));
        resp.put("vpc_SecureHashType", "SHA256");
        assertThat(new MigsProvider().complete(c, resp)).extracting(Outcome::status, Outcome::paidAmount)
            .containsExactly(Outcome.Status.PAID, new BigDecimal("1500.50"));
        resp.put("vpc_Amount", "100");
        assertThat(new MigsProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void realexHashesBothWays() {
        var c = ctx(Map.of("merchantId", "hotel", "sharedSecret", "secret"), "GBP");
        var f = new RealexProvider().begin(c).fields();
        assertThat(f).doesNotContainKey("SHA1HASH");
        assertThat(f.get("SHA256HASH")).isEqualTo(RealexProvider.sign("secret", f.get("TIMESTAMP"), "hotel", c.reference(), "150050", "GBP"));
        Map<String, String> resp = new HashMap<>(Map.of("TIMESTAMP", "20261010101010", "MERCHANT_ID", "hotel", "ORDER_ID", c.reference(),
            "RESULT", "00", "MESSAGE", "Authorised", "PASREF", "P1", "AUTHCODE", "A1", "AMOUNT", "150050"));
        resp.put("SHA256HASH", RealexProvider.sign("secret", "20261010101010", "hotel", c.reference(), "00", "Authorised", "P1", "A1"));
        assertThat(new RealexProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.PAID);
        resp.put("RESULT", "101");
        assertThat(new RealexProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.FAILED);
    }

    @Test
    void aggrePayHashesBothWays() {
        var c = ctx(Map.of("apiKey", "key", "salt", "salt"));
        var f = new AggrePayProvider().begin(c).fields();
        Map<String, String> unsigned = new HashMap<>(f);
        unsigned.remove("hash");
        assertThat(f.get("hash")).isEqualTo(AggrePayProvider.hash("salt", unsigned));
        Map<String, String> resp = new HashMap<>(Map.of("order_id", c.reference(), "response_code", "0", "amount", "1500.50", "transaction_id", "T1"));
        resp.put("hash", AggrePayProvider.hash("salt", resp));
        assertThat(new AggrePayProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.PAID);
        resp.put("amount", "1.00");
        assertThat(new AggrePayProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void airPayChecksumAndCrc() {
        var c = ctx(Map.of("merchantId", "M", "username", "u", "password", "p", "apiKey", "k"));
        var f = new AirPayProvider().begin(c).fields();
        assertThat(f.get("privatekey")).isEqualTo(Digests.sha256Hex("k@u:|:p"));
        Map<String, String> resp = new HashMap<>(Map.of("TRANSACTIONID", c.reference(), "APTRANSACTIONID", "AP1", "AMOUNT", "1500.50",
            "TRANSACTIONSTATUS", "200", "MESSAGE", "Success"));
        resp.put("ap_SecureHash", Digests.crc32(c.reference() + ":AP1:1500.50:200:Success:M:u"));
        assertThat(new AirPayProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.PAID);
        resp.put("ap_SecureHash", "1");
        assertThat(new AirPayProvider().complete(c, resp).status()).isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void razorpayCallbackSignature() {
        var c = ctx(Map.of("keyId", "k", "keySecret", "s"));
        c.state().put("linkId", "plink_1");
        Map<String, String> resp = new HashMap<>(Map.of("razorpay_payment_id", "pay_1", "razorpay_payment_link_id", "plink_1",
            "razorpay_payment_link_reference_id", c.reference(), "razorpay_payment_link_status", "paid"));
        resp.put("razorpay_signature", Digests.hmacSha256Hex("s", "plink_1|" + c.reference() + "|paid|pay_1"));
        var p = new RazorpayProvider(RestClient.create());
        assertThat(p.complete(c, resp).status()).isEqualTo(Outcome.Status.PAID);
        resp.put("razorpay_payment_link_status", "partially_paid");
        assertThat(p.complete(c, resp).status()).isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void comBankNeedsTheSessionsSuccessIndicator() {
        var c = ctx(Map.of("merchantId", "m", "apiUsername", "u", "apiPassword", "p"));
        c.state().put("successIndicator", "abc123");
        assertThat(new ComBankProvider(RestClient.create()).complete(c, Map.of("resultIndicator", "guess")).status())
            .isEqualTo(Outcome.Status.FAILED);
        assertThat(ComBankProvider.nvp("result=SUCCESS&session.id=SESSION%3D1")).containsEntry("session.id", "SESSION=1");
    }

    @Test
    void unsignedGatewaysAreNeverPaid() {
        var c = ctx(Map.of("loginId", "l", "mobiApiKey", "0123456789abcdef0123456789abcdef"));
        assertThat(new MobiVersaProvider().complete(c, Map.of("orderId", c.reference(), "responseCode", "0000")).status())
            .isEqualTo(Outcome.Status.UNVERIFIED);
        assertThat(new AccomClickProvider(RestClient.create()).complete(c, Map.of("invoiceId", c.reference(), "responseCode", "0000")).status())
            .isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void webxPaySignatureIsCheckedWithThePublicKey() throws Exception {
        var kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        var pair = kpg.generateKeyPair();
        String pub = Base64.getEncoder().encodeToString(pair.getPublic().getEncoded());
        var c = ctx(Map.of("secretKey", "s", "publicKey", pub));
        assertThat(new WebxPayProvider().begin(c).fields().get("payment")).isNotBlank();
        String plain = c.reference() + "|WX1|2026-10-10 10:00|00|Approved|card";
        // What WebXPay does: openssl_private_encrypt of the payment text (a PKCS#1 v1.5 signature with no digest).
        java.security.Signature signer = java.security.Signature.getInstance("NONEwithRSA");
        signer.initSign(pair.getPrivate());
        signer.update(plain.getBytes(StandardCharsets.UTF_8));
        String sig = Base64.getEncoder().encodeToString(signer.sign());
        String payment = Base64.getEncoder().encodeToString(plain.getBytes(StandardCharsets.UTF_8));
        assertThat(new WebxPayProvider().complete(c, Map.of("payment", payment, "signature", sig)).status()).isEqualTo(Outcome.Status.PAID);
        assertThat(new WebxPayProvider().complete(c, Map.of("payment", payment, "signature", "AAAA")).status()).isEqualTo(Outcome.Status.UNVERIFIED);
    }

    @Test
    void vendorLibrariesRunOnThisJava() throws Exception {
        TreeMap<String, String> params = new TreeMap<>(Map.of("ORDERID", "AQ1", "TXNAMOUNT", "1.00"));
        String sum = PaytmChecksum.generateSignature(params, "abcdefghijklmnop");
        assertThat(PaytmChecksum.verifySignature(params, "abcdefghijklmnop", sum)).isTrue();
        String key = PayGateCryptoUtils.generateMerchantKey();
        assertThat(PayGateCryptoUtils.decrypt(PayGateCryptoUtils.encrypt("a|b|c", key), key)).isEqualTo("a|b|c");
        assertThat(new SHAPaydollarSecure().generatePaymentSecureHash("m", "AQ1", "608", "1.00", "N", "secret")).isNotBlank();
        assertThat(AccomClickProvider.encAmount("0123456789abcdef0123456789abcdef", 150050)).matches("[0-9A-F]+");
        assertThat(GoPesProvider.encrypt("key", "0102030405060708")).isNotBlank();
        var yes = new YesBankProvider().begin(ctx(Map.of("merchantId", "1200", "terminalId", "1100", "mcc", "9399", "accessCode", "ABCD1234",
            "encryptionKey", "0123456789abcdef0123456789abcdef", "salt", "0123456789abcdef")));
        assertThat(yes.fields().get("EncData")).isNotBlank();
    }

    @Test
    void agodaPayIsRefused() {
        assertThat(new AgodaPayProvider().unsupportedReason()).contains("gateway-hosted");
        assertThatThrownBy(() -> new AgodaPayProvider().begin(ctx(Map.of()))).isInstanceOf(GatewayException.class);
    }
}
