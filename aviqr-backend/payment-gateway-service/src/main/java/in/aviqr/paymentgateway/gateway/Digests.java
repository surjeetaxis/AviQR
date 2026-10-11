package in.aviqr.paymentgateway.gateway;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.zip.CRC32;

/** Hashes and MACs the gateways sign their requests and responses with. */
public final class Digests {
    private Digests() {}

    public static byte[] digest(String algorithm, String value) {
        try {
            return MessageDigest.getInstance(algorithm).digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
    public static String sha256Hex(String value) { return HexFormat.of().formatHex(digest("SHA-256", value)); }
    public static String sha512Hex(String value) { return HexFormat.of().formatHex(digest("SHA-512", value)); }

    public static String hmacSha256Hex(byte[] key, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.ISO_8859_1)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
    public static String hmacSha256Hex(String key, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static String crc32(String value) {
        CRC32 crc = new CRC32();
        crc.update(value.getBytes(StandardCharsets.UTF_8));
        return Long.toString(crc.getValue());
    }

    /** Constant-time, case-insensitive comparison for hex/base64 signatures; false when either is missing. */
    public static boolean same(String expected, String supplied) {
        if (expected == null || supplied == null || supplied.isBlank()) return false;
        return MessageDigest.isEqual(expected.trim().toLowerCase().getBytes(StandardCharsets.UTF_8),
            supplied.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }
    /** Constant-time, case-sensitive comparison (base64). */
    public static boolean exact(String expected, String supplied) {
        if (expected == null || supplied == null || supplied.isBlank()) return false;
        return MessageDigest.isEqual(expected.trim().getBytes(StandardCharsets.UTF_8), supplied.trim().getBytes(StandardCharsets.UTF_8));
    }
}
