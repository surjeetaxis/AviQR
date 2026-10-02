package in.aviqr.menu.service;
import in.aviqr.menu.dto.MenuResponse;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class CrawlerMenuHtmlSecurityTest {
    @Test void untrustedShopPathAndNamesCannotEscapeHtmlOrJsonScript() {
        var menu = new MenuResponse();
        var shop = new MenuResponse.ShopInfoDto();
        shop.setName("</script><script>alert(1)</script>");
        menu.setShop(shop);
        String html = new CrawlerMenuHtmlRenderer().render("x\"><script>alert(2)</script>", menu);
        assertThat(html).doesNotContain("<script>alert(1)", "<script>alert(2)");
        assertThat(html).contains("%22%3E%3Cscript%3E", "\\u003c/script>");
    }
}
