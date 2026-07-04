package in.aviqr.order.controller;

import in.aviqr.order.service.InvoiceService;
import in.aviqr.order.service.InvoiceService.ShopInfoDto;
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

    private ShopInfoDto buildShop(String businessName, String address, String city,
                                   String state, String gstin, String shopPhone, String shopEmail) {
        return ShopInfoDto.builder()
            .businessName(businessName).address(address).city(city).state(state)
            .gstin(gstin).phone(shopPhone).email(shopEmail).build();
    }

    // Default: HTML invoice (used by tests and browser)
    @GetMapping("/{id}/invoice")
    public ResponseEntity<String> downloadInvoiceHtml(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "Restaurant") String businessName,
            @RequestParam(defaultValue = "")           String address,
            @RequestParam(defaultValue = "Bengaluru")  String city,
            @RequestParam(defaultValue = "Karnataka")  String state,
            @RequestParam(required = false)            String gstin,
            @RequestParam(required = false)            String shopPhone,
            @RequestParam(required = false)            String shopEmail) {
        String html = invoiceService.generateInvoiceHtml(id, buildShop(businessName, address, city, state, gstin, shopPhone, shopEmail));
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    // Explicit PDF endpoint
    @GetMapping("/{id}/invoice/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "Restaurant") String businessName,
            @RequestParam(defaultValue = "")           String address,
            @RequestParam(defaultValue = "Bengaluru")  String city,
            @RequestParam(defaultValue = "Karnataka")  String state,
            @RequestParam(required = false)            String gstin,
            @RequestParam(required = false)            String shopPhone,
            @RequestParam(required = false)            String shopEmail) {
        byte[] pdf = invoiceService.generateInvoicePdf(id, buildShop(businessName, address, city, state, gstin, shopPhone, shopEmail));
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Invoice-" + id + ".pdf\"")
            .body(pdf);
    }
}
