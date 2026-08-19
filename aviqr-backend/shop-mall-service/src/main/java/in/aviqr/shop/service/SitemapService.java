package in.aviqr.shop.service;

import in.aviqr.shop.repository.ShopRepository;
import in.aviqr.shop.repository.ShopRepository.ShopSitemapRow;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

// Renders a sitemap.xml body for every ACTIVE shop's public menu page
// (https://aviqr.com/menu/{id}) so Google can discover and index each
// onboarded business without waiting for someone to link to it manually.
//
// The XML is built once on a schedule and held in memory rather than
// recomputed per request — this endpoint is crawler traffic, not user
// traffic, and nothing else in this service caches yet, so an in-memory
// AtomicReference is the whole cache layer; no need to introduce Redis for
// one string.
@Service @RequiredArgsConstructor @Slf4j
public class SitemapService {

    private final ShopRepository shopRepository;

    private final AtomicReference<String> cachedXml = new AtomicReference<>(emptyUrlset());

    @PostConstruct
    public void init() {
        refresh();
    }

    @Scheduled(cron = "0 0 3 * * *") // 3 AM daily, alongside the other overnight jobs in this service
    public void refresh() {
        List<ShopSitemapRow> rows = shopRepository.findActiveForSitemap();
        cachedXml.set(render(rows));
        log.info("Regenerated shops sitemap with {} URL(s)", rows.size());
    }

    public String getXml() {
        return cachedXml.get();
    }

    private static String render(List<ShopSitemapRow> rows) {
        // Date-only (not ISO_LOCAL_DATE_TIME) — the sitemap protocol's W3C
        // Datetime <lastmod> requires either a full timestamp WITH a
        // timezone offset, or just a bare date; ISO_LOCAL_DATE_TIME gives
        // neither (no offset), which Google's sitemap parser rejects as
        // "Invalid date" — confirmed live in Search Console. updatedAt is a
        // LocalDateTime with no stored zone, so date-only sidesteps having
        // to guess/assume a timezone rather than risk getting it wrong.
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (ShopSitemapRow row : rows) {
            if (row.getId() == null) continue;
            sb.append("  <url>")
              .append("<loc>https://aviqr.com/menu/").append(row.getId()).append("</loc>");
            if (row.getUpdatedAt() != null) {
                sb.append("<lastmod>").append(row.getUpdatedAt().format(fmt)).append("</lastmod>");
            }
            sb.append("<changefreq>daily</changefreq><priority>0.7</priority>")
              .append("</url>\n");
        }
        sb.append("</urlset>\n");
        return sb.toString();
    }

    private static String emptyUrlset() {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>\n";
    }
}
