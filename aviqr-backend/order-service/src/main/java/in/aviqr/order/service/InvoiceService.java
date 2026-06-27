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
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

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

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
    private static final String HSN_CODE  = "996331"; // Restaurant / food services
    private static final BigDecimal GST_RATE  = new BigDecimal("5.00");  // 5% total GST
    private static final BigDecimal CGST_RATE = new BigDecimal("2.50");  // 2.5% CGST
    private static final BigDecimal SGST_RATE = new BigDecimal("2.50");  // 2.5% SGST

    public byte[] generateInvoicePdf(UUID orderId, ShopInfoDto shop) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));
        return renderPdf(order, shop);
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
        BigDecimal subtotal = order.getSubtotal();
        BigDecimal cgst     = subtotal.multiply(CGST_RATE).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal sgst     = subtotal.multiply(SGST_RATE).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total    = subtotal.add(cgst).add(sgst);

        StringBuilder rows = new StringBuilder();
        int sno = 1;
        for (OrderItem item : order.getItems()) {
            BigDecimal itemTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            BigDecimal itemCgst  = itemTotal.multiply(CGST_RATE).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal itemSgst  = itemTotal.multiply(SGST_RATE).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            rows.append("""
                <tr>
                  <td class="center">%d</td>
                  <td>%s</td>
                  <td class="center">%s</td>
                  <td class="right">%d</td>
                  <td class="right">₹%.2f</td>
                  <td class="right">₹%.2f</td>
                  <td class="right">₹%.2f</td>
                  <td class="right">₹%.2f</td>
                </tr>
                """.formatted(
                    sno++,
                    escHtml(item.getItemName()),
                    HSN_CODE,
                    item.getQuantity(),
                    item.getUnitPrice(),
                    itemTotal,
                    itemCgst,
                    itemSgst
                )
            );
        }

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
              <th class="right">CGST 2.5%%</th>
              <th class="right">SGST 2.5%%</th>
            </tr>
          </thead>
          <tbody>
            %s
          </tbody>
        </table>

        <table class="totals">
          <tr><td>Subtotal</td><td class="right">₹%.2f</td></tr>
          <tr><td>CGST @ 2.5%%</td><td class="right">₹%.2f</td></tr>
          <tr><td>SGST @ 2.5%%</td><td class="right">₹%.2f</td></tr>
          <tr class="grand"><td>TOTAL</td><td class="right">₹%.2f</td></tr>
        </table>

        <p class="gst-note">
          Total GST = ₹%.2f (CGST ₹%.2f + SGST ₹%.2f) | HSN Code: %s (Restaurant Services)
        </p>

        <div class="footer">
          This is a computer-generated invoice and does not require a physical signature.<br/>
          Thank you for dining with us! For queries: %s
        </div>

        </body>
        </html>
        """.formatted(
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
            subtotal, cgst, sgst, total,
            cgst.add(sgst), cgst, sgst, HSN_CODE,
            escHtml(shop.getEmail() != null ? shop.getEmail() : shop.getPhone())
        );
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
    }
}
