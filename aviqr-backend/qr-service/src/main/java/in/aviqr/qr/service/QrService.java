package in.aviqr.qr.service;
import in.aviqr.qr.entity.*;
import in.aviqr.qr.repository.*;
import io.nayuki.qrcodegen.QrCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;
import javax.imageio.ImageIO;

@Service @RequiredArgsConstructor
public class QrService {
    private final QrCodeRepository repo;
    private final QrScanLogRepository scanRepo;

    @Value("${app.base-url:https://aviqr.in}")
    private String baseUrl;

    @Transactional
    public in.aviqr.qr.entity.QrCode createMarketing(String label, String targetUrl, String campaign) {
        String slug = "mkt-" + (campaign != null ? campaign.toLowerCase().replaceAll("[^a-z0-9]", "-") : "aviqr");
        String candidate = slug;
        int i = 0;
        while (repo.existsByQrCode(candidate)) { candidate = slug + "-" + (++i); }
        return repo.save(in.aviqr.qr.entity.QrCode.builder()
            .qrCode(candidate)
            .targetUrl(targetUrl)
            .shopId("aviqr-marketing")
            .label(label)
            .type(QrType.CAMPAIGN)
            .groupParam(campaign)
            .build());
    }

    @Transactional
    public in.aviqr.qr.entity.QrCode updateMarketing(UUID id, String label, String targetUrl, String campaign) {
        in.aviqr.qr.entity.QrCode qr = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("QR code not found"));
        if (qr.getType() != QrType.CAMPAIGN)
            throw new RuntimeException("Not a marketing QR code");
        // qrCode slug is left untouched so already-printed materials keep working after an edit
        if (label != null && !label.isBlank()) qr.setLabel(label);
        if (targetUrl != null && !targetUrl.isBlank()) qr.setTargetUrl(targetUrl);
        if (campaign != null && !campaign.isBlank()) qr.setGroupParam(campaign);
        return repo.save(qr);
    }

    @Transactional
    public in.aviqr.qr.entity.QrCode create(String shopId, String label, QrType type, String groupParam) {
        String code = generateUniqueCode(shopId, type, groupParam);
        String url  = buildUrl(shopId, type, groupParam);

        return repo.save(in.aviqr.qr.entity.QrCode.builder()
            .qrCode(code)
            .targetUrl(url)
            .shopId(shopId)
            .label(label)
            .type(type)
            .groupParam(groupParam)
            .build());
    }

    public List<in.aviqr.qr.entity.QrCode> getByShop(String shopId) {
        return repo.findByShopId(shopId);
    }

    @Transactional
    public String resolveAndTrack(String code, String ip, String ua) {
        return repo.findByQrCode(code).map(qr -> {
            qr.setScanCount(qr.getScanCount() + 1);
            repo.save(qr);
            try {
                scanRepo.save(QrScanLog.builder().qrCode(code).ipAddress(ip).userAgent(ua)
                    .scannedAt(java.time.LocalDateTime.now()).build());
            } catch (Exception ignored) {}
            return qr.getTargetUrl();
        }).orElseThrow(() -> new RuntimeException("QR code not found"));
    }

    public byte[] generateQrImage(String code) throws Exception {
        String url = repo.findByQrCode(code).map(q -> q.getTargetUrl())
            .orElseThrow(() -> new RuntimeException("Not found"));

        QrCode qr = QrCode.encodeText(url, QrCode.Ecc.MEDIUM);
        BufferedImage img = toImage(qr, 10, 4, Color.BLACK, Color.WHITE);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "PNG", out);
        return out.toByteArray();
    }

    private BufferedImage toImage(QrCode qr, int scale, int border, Color dark, Color light) {
        int size = qr.size + border * 2;
        BufferedImage img = new BufferedImage(size * scale, size * scale, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < img.getHeight(); y++) {
            for (int x = 0; x < img.getWidth(); x++) {
                int mx = x / scale - border;
                int my = y / scale - border;
                boolean inBounds = mx >= 0 && mx < qr.size && my >= 0 && my < qr.size;
                img.setRGB(x, y, (inBounds && qr.getModule(mx, my)) ? dark.getRGB() : light.getRGB());
            }
        }
        return img;
    }

    private String generateUniqueCode(String shopId, QrType type, String group) {
        String base = shopId.toLowerCase().replaceAll("[^a-z0-9]", "").substring(0, Math.min(8, shopId.length()));
        String suffix = switch (type) {
            case TABLE -> "-t" + group;
            case GROUP -> "-g" + group;
            case HOTEL_ROOM -> "-r" + group;
            case HOTEL_OUTLET -> "-o" + group;
            default -> "";
        };
        String code = base + suffix;
        // ensure unique
        int i = 0;
        String candidate = code;
        while (repo.existsByQrCode(candidate)) { candidate = code + "-" + (++i); }
        return candidate;
    }

    private String buildUrl(String shopId, QrType type, String group) {
        String base = baseUrl + "/menu/" + shopId;
        return switch (type) {
            case TABLE        -> base + "?table=" + group;
            case GROUP        -> base + "?cat=" + group;
            case MALL         -> baseUrl + "/mall/" + shopId;
            // shopId is a synthetic "hotel-{hotelId}" id (rooms have no shop-service Shop); group = room number
            case HOTEL_ROOM   -> baseUrl + "/hotel/" + shopId.replaceFirst("^hotel-", "") + "/room/" + group;
            // shopId is the outlet's real shop-service Shop id; group = hotelId, enables "bill to room" on the menu
            case HOTEL_OUTLET -> base + "?hotel=" + group;
            default           -> base;
        };
    }
}