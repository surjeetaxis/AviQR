// ── FILE: order-service/src/main/java/in/aviqr/order/controller/KotController.java ──
package in.aviqr.order.controller;

import in.aviqr.order.service.KotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * MARKET FEATURE: Kitchen Order Ticket endpoint.
 *
 * GET /api/v1/orders/{id}/kot
 *
 * Returns 80mm-optimised HTML for browser printing or thermal printer.
 *
 * Frontend integration — auto-print on new order:
 *
 *   // In Dashboard.jsx useEffect / order polling:
 *   if (newOrder) {
 *     const kotWin = window.open(
 *       `${BASE_URL}/api/v1/orders/${newOrder.id}/kot`,
 *       'aviqr_kot',    // named window — triggers auto-print in KOT HTML
 *       'width=400,height=600'
 *     );
 *   }
 *
 * For auto-print without popup blocker issues, redirect through a hidden iframe:
 *
 *   const iframe = document.createElement('iframe');
 *   iframe.style.display = 'none';
 *   iframe.src = `/api/v1/orders/${orderId}/kot`;
 *   document.body.appendChild(iframe);
 *   iframe.onload = () => iframe.contentWindow.print();
 */
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class KotController {

    private final KotService kotService;

    @GetMapping(value = "/{id}/kot", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getKot(@PathVariable UUID id) {
        String html = kotService.generateKotHtml(id);
        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_HTML)
            .body(html);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// ALSO ADD to OrderService.updateStatus() — publish status event to RabbitMQ
// so notification-service can trigger WhatsApp on READY:
//
//  @Transactional
//  public OrderResponse updateStatus(UUID id, String status, String userId) {
//      Order order = repo.findById(id).orElseThrow(...);
//      order.setStatus(OrderStatus.valueOf(status.toUpperCase()));
//      ...
//      Order saved = repo.save(order);
//
//      // NEW: publish status change event
//      try {
//          rabbit.convertAndSend("aviqr.orders", "order.status", Map.of(
//              "orderId",       saved.getId().toString(),
//              "orderNumber",   saved.getOrderNumber(),
//              "shopId",        saved.getShopId(),
//              "status",        status.toUpperCase(),
//              "customerPhone", saved.getCustomerPhone() != null ? saved.getCustomerPhone() : "",
//              "customerName",  saved.getCustomerName(),
//              "tableNumber",   saved.getTableNumber() != null ? saved.getTableNumber() : ""
//          ));
//      } catch (Exception e) { log.warn("Failed to publish status event: {}", e.getMessage()); }
//
//      return toDto(saved);
//  }
// ─────────────────────────────────────────────────────────────────────────────
