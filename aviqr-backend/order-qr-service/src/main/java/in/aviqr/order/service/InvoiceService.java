// ── FILE: order-service/src/main/java/in/aviqr/order/service/InvoiceService.java ──
//
// ADD to order-service/build.gradle:
//   implementation 'com.itextpdf:itext7-core:8.0.4'
//   implementation 'com.itextpdf:html2pdf:5.0.4'
//
package in.aviqr.order.service;

import com.itextpdf.html2pdf.ConverterProperties;
import com.itextpdf.html2pdf.HtmlConverter;
import in.aviqr.order.entity.Order;
import in.aviqr.order.entity.OrderItem;
import in.aviqr.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * MARKET FEATURE: GST-compliant Tax Invoice PDF.
 *
 * Generates a proper Indian GST Tax Invoice per order containing:
 *  - Supplier GSTIN, business name, address
 *  - Unique invoice number (INV-{orderNumber})
 *  - HSN code 996331 (restaurant services)
 *  - Item-wise breakdown: qty × rate = amount
 *  - CGST + SGST split (2.5% + 2.5% = 5% total)
 *  - Total in words
 *  - "This is a computer-generated invoice" footer
 *
 * Usage: GET /api/v1/orders/{id}/invoice → returns PDF bytes
 * The controller sets Content-Type: application/pdf and filename header.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceService {

    private final OrderRepository orderRepo;
    private final RestTemplate restTemplate;

    @Value("${shop.service.url:http://shop-mall-service}")
    private String shopServiceUrl;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
    private static final String HSN_CODE  = "996331"; // Restaurant / food services

    public byte[] generateInvoicePdf(UUID orderId) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        return renderPdf(order, fetchShopInfo(order.getShopId()));
    }

    public String generateInvoiceHtml(UUID orderId) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        return buildHtml(order, fetchShopInfo(order.getShopId()));
    }

    /** Real shop name/address/GSTIN/logo for the invoice header — looked up server-side
     *  by the order's shopId rather than trusted from caller-supplied query params (which
     *  always defaulted to a generic "Restaurant"/"Bengaluru" placeholder regardless of
     *  which shop the order actually belonged to). Falls back to a placeholder only if
     *  shop-mall-service can't be reached. */
    private ShopInfoDto fetchShopInfo(String shopId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(shopServiceUrl + "/api/v1/shops/" + shopId, Map.class);
            if (resp != null && resp.get("data") instanceof Map<?,?> data) {
                return ShopInfoDto.builder()
                    .businessName(str(data, "name", "Restaurant"))
                    .address(str(data, "address", ""))
                    .city(str(data, "city", "Bengaluru"))
                    .state(str(data, "state", "Karnataka"))
                    .gstin(str(data, "gstin", null))
                    .phone(str(data, "phone", null))
                    .email(str(data, "email", null))
                    .logoUrl(str(data, "logoUrl", null))
                    .build();
            }
        } catch (Exception e) {
            log.debug("Could not fetch shop info for invoice, shop {}: {}", shopId, e.getMessage());
        }
        return ShopInfoDto.builder().businessName("Restaurant").address("").city("Bengaluru").state("Karnataka").build();
    }

    private String str(Map<?, ?> m, String key, String fallback) {
        Object v = m.get(key);
        return v != null ? v.toString() : fallback;
    }

    private byte[] renderPdf(Order order, ShopInfoDto shop) {
        String html = buildHtml(order, shop);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ConverterProperties props = new ConverterProperties();
            HtmlConverter.convertToPdf(html, baos, props);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Invoice PDF generation failed for order {}", order.getId(), e);
            throw new RuntimeException("Failed to generate invoice PDF", e);
        }
    }

    private String buildHtml(Order order, ShopInfoDto shop) {
        // Real, already-charged amounts — not recomputed from a hardcoded GST rate, so this
        // matches what the customer actually paid even when a shop's tax % differs from 5%.
        BigDecimal subtotal      = order.getSubtotal();
        BigDecimal discount      = order.getDiscount()      != null ? order.getDiscount()      : BigDecimal.ZERO;
        BigDecimal serviceCharge = order.getServiceCharge() != null ? order.getServiceCharge() : BigDecimal.ZERO;
        BigDecimal tax           = order.getTax()           != null ? order.getTax()           : BigDecimal.ZERO;
        BigDecimal total         = order.getTotalAmount();
        BigDecimal cgst = tax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal sgst = tax.subtract(cgst);

        StringBuilder rows = new StringBuilder();
        int sno = 1;
        for (OrderItem item : order.getItems()) {
            BigDecimal itemTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            rows.append("""
                <tr>
                  <td class="center">%d</td>
                  <td>%s</td>
                  <td class="center">%s</td>
                  <td class="right">%d</td>
                  <td class="right">₹%.2f</td>
                  <td class="right">₹%.2f</td>
                </tr>
                """.formatted(
                    sno++,
                    itemDescription(item),
                    HSN_CODE,
                    item.getQuantity(),
                    item.getUnitPrice(),
                    itemTotal
                )
            );
        }

        StringBuilder totals = new StringBuilder();
        totals.append("<tr><td>Subtotal</td><td class=\"right\">₹%.2f</td></tr>".formatted(subtotal));
        if (discount.signum() > 0)
            totals.append("<tr><td>Discount</td><td class=\"right\">− ₹%.2f</td></tr>".formatted(discount));
        if (serviceCharge.signum() > 0)
            totals.append("<tr><td>Service Charge</td><td class=\"right\">₹%.2f</td></tr>".formatted(serviceCharge));
        if (tax.signum() > 0) {
            totals.append("<tr><td>CGST</td><td class=\"right\">₹%.2f</td></tr>".formatted(cgst));
            totals.append("<tr><td>SGST</td><td class=\"right\">₹%.2f</td></tr>".formatted(sgst));
        }
        totals.append("<tr class=\"grand\"><td>TOTAL</td><td class=\"right\">₹%.2f</td></tr>".formatted(total));

        String logoHtml = (shop.getLogoUrl() != null && !shop.getLogoUrl().isBlank())
            ? "<img src=\"%s\" alt=\"logo\" style=\"max-height:48px;max-width:120px;margin-bottom:6px;\"/><br/>".formatted(escHtml(shop.getLogoUrl()))
            : "";

        String invoiceDate = order.getCreatedAt() != null
            ? order.getCreatedAt().format(DATE_FMT) : "N/A";

        return """
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8"/>
        <style>
          body  { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 24px; }
          h1    { font-size: 18px; margin: 0; color: #1A56DB; }
          h2    { font-size: 13px; margin: 0 0 4px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 16px; }
          .header-left { max-width: 60%%; }
          .header-right { text-align: right; }
          .badge { background: #1A56DB; color: white; font-size: 12px; font-weight: bold;
                   padding: 4px 12px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
          .divider { border-top: 2px solid #1A56DB; margin: 12px 0; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .meta-box { background: #f5f7ff; padding: 8px 12px; border-radius: 4px; min-width: 160px; }
          .meta-box .lbl { color: #666; font-size: 10px; margin-bottom: 2px; }
          .meta-box .val { font-weight: bold; font-size: 12px; }
          table  { width: 100%%; border-collapse: collapse; margin: 12px 0; }
          th     { background: #1A56DB; color: white; padding: 7px 6px; text-align: left; font-size: 10px; }
          td     { padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
          tr:nth-child(even) td { background: #f9fafb; }
          .right  { text-align: right; }
          .center { text-align: center; }
          .totals { width: 300px; margin-left: auto; margin-top: 8px; }
          .totals tr td { border: none; padding: 3px 6px; }
          .totals .grand { font-weight: bold; font-size: 12px; border-top: 2px solid #1A56DB; }
          .footer { margin-top: 20px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          .gst-note { font-size: 10px; color: #555; margin-top: 8px; }
        </style>
        </head>
        <body>

        <div class="header">
          <div class="header-left">
            %s
            <h1>%s</h1>
            <p style="margin:4px 0; color:#555;">%s</p>
            <p style="margin:2px 0; color:#555;">%s</p>
            <p style="margin:2px 0;">GSTIN: <strong>%s</strong></p>
          </div>
          <div class="header-right">
            <div class="badge">TAX INVOICE</div><br/>
            <p style="margin:4px 0;"><strong>Invoice No:</strong> INV-%s</p>
            <p style="margin:2px 0;"><strong>Date &amp; Time:</strong> %s</p>
            <p style="margin:2px 0;"><strong>Order No:</strong> %s</p>
          </div>
        </div>

        <div class="divider"></div>

        <div class="meta">
          <div class="meta-box">
            <div class="lbl">BILLED TO</div>
            <div class="val">%s</div>
            <div style="font-size:10px; color:#555;">%s</div>
          </div>
          <div class="meta-box">
            <div class="lbl">TABLE</div>
            <div class="val">%s</div>
          </div>
          <div class="meta-box">
            <div class="lbl">PAYMENT METHOD</div>
            <div class="val">%s</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width:30px">S.No</th>
              <th>Item Description</th>
              <th class="center">HSN</th>
              <th class="right">Qty</th>
              <th class="right">Rate (₹)</th>
              <th class="right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            %s
          </tbody>
        </table>

        <table class="totals">
          %s
        </table>

        <p class="gst-note">
          HSN Code: %s (Restaurant Services)
        </p>

        <div class="footer">
          This is a computer-generated invoice and does not require a physical signature.<br/>
          Thank you for dining with us! For queries: %s
        </div>

        </body>
        </html>
        """.formatted(
            logoHtml,
            escHtml(shop.getBusinessName()),
            escHtml(shop.getAddress()),
            escHtml(shop.getCity() + ", " + shop.getState()),
            escHtml(shop.getGstin() != null ? shop.getGstin() : "Pending registration"),
            escHtml(order.getOrderNumber()),
            invoiceDate,
            escHtml(order.getOrderNumber()),
            escHtml(order.getCustomerName()),
            escHtml(order.getCustomerPhone() != null ? order.getCustomerPhone() : "Walk-in"),
            escHtml(order.getTableNumber() != null ? "Table " + order.getTableNumber() : "Takeaway"),
            escHtml(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "CASH"),
            rows.toString(),
            totals.toString(),
            HSN_CODE,
            escHtml(shop.getEmail() != null ? shop.getEmail() : shop.getPhone())
        );
    }

    /** Item Description cell: name, plus the selected variant (if any) and a smaller
     *  line listing selected add-ons with their individual prices (if any). */
    private String itemDescription(OrderItem item) {
        StringBuilder desc = new StringBuilder(escHtml(item.getItemName()));
        if (item.getVariantName() != null && !item.getVariantName().isBlank()) {
            desc.append(" <span style=\"color:#666;\">(").append(escHtml(item.getVariantName())).append(")</span>");
        }
        if (item.getAddons() != null && !item.getAddons().isEmpty()) {
            String addonText = item.getAddons().stream()
                .map(a -> escHtml(a.getName()) + " (+₹%.2f)".formatted(a.getPrice()))
                .collect(Collectors.joining(", "));
            desc.append("<br/><span style=\"font-size:9px;color:#888;\">+ ").append(addonText).append("</span>");
        }
        return desc.toString();
    }

    private String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    /** DTO for shop info needed on the invoice */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ShopInfoDto {
        private String businessName;
        private String address;
        private String city;
        private String state;
        private String gstin;
        private String phone;
        private String email;
        private String logoUrl;
    }
}
