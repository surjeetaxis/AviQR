package in.aviqr.shop.controller;

import in.aviqr.shop.service.SitemapService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Own top-level path, not nested under /api/v1/shops/** — that path is
// gateway-routed with AuthenticationFilter, same reasoning as
// NearbyShopController. Frontend nginx reverse-proxies
// https://aviqr.com/sitemap-shops.xml to this endpoint through the gateway
// so the sitemap is served from the same origin as the URLs it lists, which
// the sitemap protocol requires.
@RestController @RequestMapping("/api/v1/sitemap") @RequiredArgsConstructor
public class SitemapController {
    private final SitemapService service;

    @GetMapping(value = "/shops.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> shopsSitemap() {
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_XML)
            .body(service.getXml());
    }
}
