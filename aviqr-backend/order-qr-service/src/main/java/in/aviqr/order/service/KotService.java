// ── FILE: order-service/src/main/java/in/aviqr/order/service/KotService.java ──
package in.aviqr.order.service;

import in.aviqr.order.entity.Order;
import in.aviqr.order.entity.OrderItem;
import in.aviqr.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.UUID;

/**
 * MARKET FEATURE: Kitchen Order Ticket (KOT) for thermal printers.
 *
 * Every Indian restaurant kitchen runs on printed KOTs.
 * This generates an 80mm-width HTML page optimised for:
 *  - Browser print (Ctrl+P) on any device
 *  - Thermal printer direct print via USB/network
 *  - POS display on kitchen tablet
 *
 * Endpoint: GET /api/v1/orders/{id}/kot
 * Returns: text/html — open in browser and print, or auto-print on new order.
 *
 * Auto-print integration (Frontend):
 *   window.open('/api/v1/orders/' + orderId + '/kot', '_blank').print();
 * Or use the browser's print API with @media print CSS.
 */
@Service
@RequiredArgsConstructor
public class KotService {

    private final OrderRepository orderRepo;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM");

    public String generateKotHtml(UUID orderId) {
        Order order = orderRepo.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        StringBuilder rows = new StringBuilder();
        for (OrderItem item : order.getItems()) {
            rows.append("""
                <tr>
                  <td class="qty">%d</td>
                  <td class="item">%s%s</td>
                </tr>
                """.formatted(
                    item.getQuantity(),
                    escHtml(item.getItemName()),
                    item.getNotes() != null && !item.getNotes().isBlank()
                        ? "<div class='note'>※ " + escHtml(item.getNotes()) + "</div>"
                        : ""
                )
            );
        }

        String time = order.getCreatedAt() != null
            ? order.getCreatedAt().format(TIME_FMT) : "—";

        return """
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8"/>
        <title>KOT — %s</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            width: 76mm;
            padding: 4mm 3mm;
            color: #000;
            background: #fff;
          }
          .header  { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
          .kot-tag { font-size: 22px; font-weight: bold; letter-spacing: 4px; }
          .order-no{ font-size: 20px; font-weight: bold; margin: 4px 0; }
          .meta    { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          table    { width: 100%%; border-collapse: collapse; }
          .qty     { width: 24px; font-size: 18px; font-weight: bold; vertical-align: top; padding: 4px 4px 4px 0; }
          .item    { font-size: 15px; font-weight: bold; padding: 4px 0; vertical-align: top; }
          .note    { font-size: 12px; font-weight: normal; color: #555; margin-top: 2px; }
          .footer  { text-align: center; font-size: 11px; border-top: 1px dashed #000; padding-top: 4px; margin-top: 8px; }
          @media print {
            body { width: 76mm; }
            .no-print { display: none !important; }
          }
        </style>
        </head>
        <body>

        <div class="header">
          <div class="kot-tag">K O T</div>
          <div class="order-no">#%s</div>
        </div>

        <div class="meta">
          <span><strong>Table:</strong> %s</span>
          <span>%s</span>
        </div>
        <div class="meta">
          <span><strong>Type:</strong> %s</span>
          <span><strong>Waiter:</strong> —</span>
        </div>

        <div class="divider"></div>

        <table>%s</table>

        <div class="divider"></div>

        %s

        <div class="footer">
          AviQR · KOT AUTO-PRINTED
        </div>

        <div class="no-print" style="text-align:center;margin-top:16px">
          <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer">🖨 Print KOT</button>
        </div>

        <script>
          // Auto-print when opened in new tab (used by frontend auto-KOT)
          if (window.name === 'aviqr_kot') { window.onload = () => window.print(); }
        </script>
        </body>
        </html>
        """.formatted(
            escHtml(order.getOrderNumber()),
            escHtml(order.getOrderNumber()),
            order.getTableNumber() != null ? escHtml(order.getTableNumber()) : "Takeaway",
            time,
            order.getType() != null ? order.getType().name() : "DINE_IN",
            rows,
            order.getNotes() != null && !order.getNotes().isBlank()
                ? "<div class='meta'><strong>⚠ Note:</strong> " + escHtml(order.getNotes()) + "</div><div class='divider'></div>"
                : ""
        );
    }

    private String escHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
