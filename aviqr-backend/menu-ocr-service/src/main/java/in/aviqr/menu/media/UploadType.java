package in.aviqr.menu.media;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

/**
 * The file types /media/upload accepts, recognised from the file's first bytes.
 * The browser-supplied Content-Type and the filename are never trusted: a renamed
 * HTML or SVG file would otherwise be stored and served from the bucket as-is.
 * The stored object's content type and extension always come from here.
 */
public enum UploadType {
    JPEG("image/jpeg", ".jpg"), PNG("image/png", ".png"), WEBP("image/webp", ".webp"), GIF("image/gif", ".gif"),
    MP4("video/mp4", ".mp4"), MOV("video/quicktime", ".mov"), WEBM("video/webm", ".webm"),
    GLB("model/gltf-binary", ".glb"), GLTF("model/gltf+json", ".gltf");

    public final String contentType;
    public final String extension;

    UploadType(String contentType, String extension) { this.contentType = contentType; this.extension = extension; }

    /** Bytes needed by {@link #detect}. */
    public static final int HEADER_BYTES = 32;

    /** Detects the type from the file header, limited to what {@code kind} allows. */
    public static Optional<UploadType> detect(byte[] head, String kind) {
        UploadType found = sniff(head);
        if (found == null) return Optional.empty();
        boolean allowed = switch (kind == null ? "image" : kind) {
            case "video" -> found == MP4 || found == MOV || found == WEBM;
            case "panorama" -> found == JPEG || found == PNG || found == WEBP;
            case "model" -> found == GLB || found == GLTF;
            default -> found == JPEG || found == PNG || found == WEBP || found == GIF;
        };
        return allowed ? Optional.of(found) : Optional.empty();
    }

    private static UploadType sniff(byte[] h) {
        if (h == null || h.length < 4) return null;
        if (u(h, 0) == 0xFF && u(h, 1) == 0xD8 && u(h, 2) == 0xFF) return JPEG;
        if (starts(h, 0, new byte[]{(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'})) return PNG;
        if (starts(h, 0, ascii("GIF87a")) || starts(h, 0, ascii("GIF89a"))) return GIF;
        if (starts(h, 0, ascii("RIFF")) && starts(h, 8, ascii("WEBP"))) return WEBP;
        if (u(h, 0) == 0x1A && u(h, 1) == 0x45 && u(h, 2) == 0xDF && u(h, 3) == 0xA3) return WEBM;
        if (starts(h, 4, ascii("ftyp"))) return starts(h, 8, ascii("qt  ")) ? MOV : MP4;
        if (starts(h, 0, ascii("glTF"))) return GLB;
        // A .gltf model is JSON: accept it only when the first non-blank character opens an object.
        for (byte b : h) {
            if (b == ' ' || b == '\t' || b == '\r' || b == '\n') continue;
            if (u(h, 0) == 0xEF && u(h, 1) == 0xBB && u(h, 2) == 0xBF) return u(h, 3) == '{' ? GLTF : null; // UTF-8 BOM
            return b == '{' ? GLTF : null;
        }
        return null;
    }

    private static int u(byte[] h, int i) { return i < h.length ? h[i] & 0xFF : -1; }
    private static byte[] ascii(String s) { return s.getBytes(StandardCharsets.US_ASCII); }
    private static boolean starts(byte[] h, int at, byte[] sig) {
        return h.length >= at + sig.length && Arrays.equals(Arrays.copyOfRange(h, at, at + sig.length), sig);
    }
}
