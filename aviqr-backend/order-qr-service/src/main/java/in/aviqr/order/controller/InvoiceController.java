package in.aviqr.order.controller;

import in.aviqr.order.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    // Default: HTML invoice (used by tests and browser). Shop name/address/GSTIN/logo are
    // looked up server-side from the order's shopId — see InvoiceService.fetchShopInfo.
    @GetMapping("/{id}/invoice")
    public ResponseEntity<String> downloadInvoiceHtml(@PathVariable UUID id) {
        String html = invoiceService.generateInvoiceHtml(id);
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    // Explicit PDF endpoint
    @GetMapping("/{id}/invoice/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable UUID id) {
        byte[] pdf = invoiceService.generateInvoicePdf(id);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Invoice-" + id + ".pdf\"")
            .body(pdf);
    }
}
