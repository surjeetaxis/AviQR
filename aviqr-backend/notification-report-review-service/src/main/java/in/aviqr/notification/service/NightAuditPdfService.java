package in.aviqr.notification.service;

import com.itextpdf.html2pdf.ConverterProperties;
import com.itextpdf.html2pdf.HtmlConverter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Map;

/** Renders the daily night-audit email's PDF attachment — same iText7 +
 *  html2pdf approach as order-qr-service's InvoiceService (build HTML, convert). */
@Service @Slf4j
public class NightAuditPdfService {

    public byte[] render(Map<String, Object> event) {
        String html = """
            <html><body style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#111827;">
              <h2 style="margin-bottom:2px;">%s</h2>
              <p style="color:#6B7280;margin-top:0;">Night Audit &mdash; %s</p>
              <table style="width:100%%;border-collapse:collapse;margin-top:12px;">
                %s
              </table>
              <p style="color:#9CA3AF;font-size:11px;margin-top:24px;">Generated automatically by AviQR PMS.</p>
            </body></html>
            """.formatted(esc(event.get("hotelName")), esc(event.get("date")), rows(event));
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            HtmlConverter.convertToPdf(html, baos, new ConverterProperties());
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Night-audit PDF generation failed", e);
            throw new RuntimeException("Failed to generate night-audit PDF", e);
        }
    }

    private String rows(Map<String, Object> e) {
        Object[][] pairs = {
            {"Occupancy", e.get("occupancyPercent") + "% (" + e.get("roomsSold") + "/" + e.get("totalRooms") + " rooms)"},
            {"ADR (avg. daily rate)", "₹" + e.get("adr")},
            {"RevPAR", "₹" + e.get("revPar")},
            {"Room revenue", "₹" + e.get("roomRevenue")},
            {"Arrivals", e.get("arrivals")},
            {"Departures", e.get("departures")},
            {"No-shows", e.get("noShows")},
            {"Cancellations", e.get("cancellations")},
        };
        StringBuilder sb = new StringBuilder();
        for (Object[] p : pairs) {
            sb.append("<tr style=\"border-bottom:1px solid #E5E7EB;\">")
              .append("<td style=\"padding:6px 10px;color:#6B7280;\">").append(esc(p[0])).append("</td>")
              .append("<td style=\"padding:6px 10px;font-weight:700;text-align:right;\">").append(esc(p[1])).append("</td>")
              .append("</tr>");
        }
        return sb.toString();
    }

    private String esc(Object v) {
        return v == null ? "" : v.toString().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
