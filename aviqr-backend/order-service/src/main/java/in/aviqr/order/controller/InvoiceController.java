// ── FILE: order-service/src/main/java/in/aviqr/order/controller/InvoiceController.java ──
package in.aviqr.order.controller;

import in.aviqr.order.service.InvoiceService;
import in.aviqr.order.service.InvoiceService.ShopInfoDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * MARKET FEATURE: GST Tax Invoice download endpoint.
 *
 * GET /api/v1/orders/{id}/invoice?shopId=...
 *
 * In production the shop details are fetched from shop-service via Feign/RestTemplate.
 * For now the controller accepts them as query params so the feature works immediately
 * without inter-service wiring. Replace with a ShopClient Feign call later.
 *
 * Response: application/pdf with Content-Disposition: attachment; filename="INV-ORD-xxx.pdf"
 */
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping("/{id}/invoice")
    public ResponseEntity<byte[]> downloadInvoice(
            @PathVariable UUID id,
            // Shop details — in production fetch these from shop-service via Feign
            @RequestParam(defaultValue = "Restaurant")    String businessName,
            @RequestParam(defaultValue = "")              String address,
            @RequestParam(defaultValue = "Bengaluru")     String city,
            @RequestParam(defaultValue = "Karnataka")     String state,
            @RequestParam(required = false)               String gstin,
            @RequestParam(required = false)               String shopPhone,
            @RequestParam(required = false)               String shopEmail) {

        ShopInfoDto shop = ShopInfoDto.builder()
            .businessName(businessName)
            .address(address)
            .city(city)
            .state(state)
            .gstin(gstin)
            .phone(shopPhone)
            .email(shopEmail)
            .build();

        byte[] pdf = invoiceService.generateInvoicePdf(id, shop);

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"Invoice-" + id + ".pdf\"")
            .body(pdf);
    }
}
