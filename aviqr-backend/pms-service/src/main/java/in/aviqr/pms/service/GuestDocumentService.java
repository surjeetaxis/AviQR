package in.aviqr.pms.service;

import in.aviqr.pms.entity.GuestDocument;
import in.aviqr.pms.repository.GuestDocumentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Encrypted storage for guest ID scans. The key (PMS_DOCUMENT_KEY, base64 of 32 random
 *  bytes) lives only in the service environment; without it uploads are refused rather
 *  than stored in the clear. Scans are deleted a configurable number of days after the
 *  stay ends. */
@Service @Slf4j
public class GuestDocumentService {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    static final Set<String> TYPES = Set.of("image/jpeg", "image/png", "image/webp", "application/pdf");
    static final Set<String> DOC_TYPES = Set.of("AADHAAR", "PASSPORT", "DRIVING_LICENCE", "VOTER_ID", "PAN", "OTHER");

    private final GuestDocumentRepository repo;
    private final SecretKeySpec key;
    private final int retentionDays;
    private final SecureRandom random = new SecureRandom();

    public GuestDocumentService(GuestDocumentRepository repo,
            @Value("${pms.documents.key:${PMS_DOCUMENT_KEY:}}") String encodedKey,
            @Value("${pms.documents.retention-days:30}") int retentionDays) {
        this.repo = repo;
        this.retentionDays = Math.max(1, retentionDays);
        byte[] raw = encodedKey.isBlank() ? null : Base64.getDecoder().decode(encodedKey.trim());
        if (raw != null && raw.length != 32) throw new IllegalStateException("PMS_DOCUMENT_KEY must be base64 of exactly 32 bytes");
        this.key = raw == null ? null : new SecretKeySpec(raw, "AES");
        if (key == null) log.warn("PMS_DOCUMENT_KEY is not set: guest ID uploads are disabled");
    }

    public boolean enabled() { return key != null; }

    @Transactional
    public GuestDocument store(UUID hotelId, UUID reservationId, String docType, String contentType, byte[] data, String uploadedBy) {
        if (!enabled()) throw new IllegalStateException("ID document storage isn't configured on this server");
        String type = docType == null ? "OTHER" : docType.trim().toUpperCase();
        if (!DOC_TYPES.contains(type)) throw new IllegalArgumentException("Unknown document type");
        if (contentType == null || !TYPES.contains(contentType)) throw new IllegalArgumentException("Upload a JPEG, PNG, WebP image or a PDF");
        if (data == null || data.length == 0 || data.length > MAX_BYTES) throw new IllegalArgumentException("Files must be under 5 MB");
        if (!looksLike(contentType, data)) throw new IllegalArgumentException("The file doesn't match its type");
        byte[] iv = new byte[12];
        random.nextBytes(iv);
        return repo.save(GuestDocument.builder().hotelId(hotelId).reservationId(reservationId).docType(type).contentType(contentType)
            .sizeBytes(data.length).iv(iv).content(crypt(Cipher.ENCRYPT_MODE, iv, data, reservationId)).uploadedBy(uploadedBy).build());
    }

    public byte[] read(GuestDocument doc) {
        if (!enabled()) throw new IllegalStateException("ID document storage isn't configured on this server");
        return crypt(Cipher.DECRYPT_MODE, doc.getIv(), doc.getContent(), doc.getReservationId());
    }

    public List<GuestDocumentRepository.Summary> list(UUID reservationId) { return repo.findByReservationIdOrderByCreatedAtAsc(reservationId); }

    @Scheduled(cron = "${pms.documents.purge.cron:0 30 3 * * *}")
    @Transactional
    public void purgeExpired() {
        int removed = repo.deleteForStaysEndedBefore(LocalDate.now().minusDays(retentionDays));
        if (removed > 0) log.info("Deleted {} guest ID scan(s) older than {} days after check-out", removed, retentionDays);
    }

    /** The reservation id is bound as AAD, so a scan can't be swapped onto another booking. */
    private byte[] crypt(int mode, byte[] iv, byte[] input, UUID reservationId) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(mode, key, new GCMParameterSpec(128, iv));
            cipher.updateAAD(reservationId.toString().getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            return cipher.doFinal(input);
        } catch (Exception e) {
            throw new IllegalStateException("Could not " + (mode == Cipher.ENCRYPT_MODE ? "encrypt" : "decrypt") + " the document", e);
        }
    }

    /** Checks magic bytes so a renamed file can't pass as an image. */
    static boolean looksLike(String type, byte[] d) {
        return switch (type) {
            case "image/jpeg" -> d.length > 3 && (d[0] & 0xff) == 0xFF && (d[1] & 0xff) == 0xD8 && (d[2] & 0xff) == 0xFF;
            case "image/png" -> d.length > 8 && (d[0] & 0xff) == 0x89 && d[1] == 'P' && d[2] == 'N' && d[3] == 'G';
            case "image/webp" -> d.length > 12 && d[0] == 'R' && d[1] == 'I' && d[2] == 'F' && d[3] == 'F' && d[8] == 'W' && d[9] == 'E' && d[10] == 'B' && d[11] == 'P';
            case "application/pdf" -> d.length > 4 && d[0] == '%' && d[1] == 'P' && d[2] == 'D' && d[3] == 'F';
            default -> false;
        };
    }
}
