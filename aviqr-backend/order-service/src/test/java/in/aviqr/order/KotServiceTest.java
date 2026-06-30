package in.aviqr.order;

import in.aviqr.order.entity.*;
import in.aviqr.order.repository.OrderRepository;
import in.aviqr.order.service.KotService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class KotServiceTest {

    @Mock OrderRepository repo;
    @InjectMocks KotService kotService;

    private Order order(String orderNum, String... itemNames) {
        List<OrderItem> items = new ArrayList<>();
        for (String name : itemNames) {
            items.add(OrderItem.builder()
                    .id(UUID.randomUUID())
                    .itemName(name)
                    .quantity(2)
                    .unitPrice(BigDecimal.valueOf(100))
                    .totalPrice(BigDecimal.valueOf(200))
                    .build());
        }
        return Order.builder()
                .id(UUID.randomUUID())
                .orderNumber(orderNum)
                .shopId("shop-101")
                .customerName("Test Customer")
                .tableNumber("5")
                .type(OrderType.DINE_IN)
                .status(OrderStatus.NEW)
                .paymentMethod(PaymentMethod.ONLINE)
                .paymentStatus(PaymentStatus.PAID)
                .subtotal(BigDecimal.valueOf(200))
                .tax(BigDecimal.TEN)
                .totalAmount(BigDecimal.valueOf(210))
                .items(items)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("generateKotHtml: output contains the order number")
    void generateKotHtml_containsOrderNumber() {
        var o = order("ORD-9999", "Butter Chicken");
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).contains("ORD-9999");
    }

    @Test
    @DisplayName("generateKotHtml: output contains all item names")
    void generateKotHtml_containsAllItemNames() {
        var o = order("ORD-8888", "Dal Makhani", "Garlic Naan", "Gulab Jamun");
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).contains("Dal Makhani", "Garlic Naan", "Gulab Jamun");
    }

    @Test
    @DisplayName("generateKotHtml: table number is present in output")
    void generateKotHtml_containsTableNumber() {
        var o = order("ORD-7777", "Paneer Tikka");
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).contains("5"); // table number
    }

    @Test
    @DisplayName("generateKotHtml: HTML is well-formed (has html/body tags)")
    void generateKotHtml_isWellFormedHtml() {
        var o = order("ORD-6666", "Masala Chai");
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).contains("<html").contains("</html>")
                        .contains("<body").contains("</body>");
    }

    @Test
    @DisplayName("generateKotHtml: XSS in item name is HTML-escaped")
    void generateKotHtml_xssIsEscaped() {
        var item = OrderItem.builder()
                .id(UUID.randomUUID()).itemName("<script>alert('xss')</script>")
                .quantity(1).unitPrice(BigDecimal.TEN).totalPrice(BigDecimal.TEN).build();
        var o = Order.builder()
                .id(UUID.randomUUID()).orderNumber("ORD-XSS").shopId("s1")
                .customerName("Hacker").type(OrderType.DINE_IN).status(OrderStatus.NEW)
                .paymentMethod(PaymentMethod.ONLINE).paymentStatus(PaymentStatus.PAID)
                .subtotal(BigDecimal.TEN).tax(BigDecimal.ONE).totalAmount(BigDecimal.valueOf(11))
                .items(List.of(item)).createdAt(LocalDateTime.now()).build();
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).doesNotContain("<script>alert");
        assertThat(html).contains("&lt;script&gt;");
    }

    @Test
    @DisplayName("generateKotHtml: unknown order ID throws RuntimeException")
    void generateKotHtml_unknownOrder_throws() {
        when(repo.findById(any())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> kotService.generateKotHtml(UUID.randomUUID()))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    @DisplayName("generateKotHtml: item notes are included in output")
    void generateKotHtml_itemNotesIncluded() {
        var item = OrderItem.builder()
                .id(UUID.randomUUID()).itemName("Chicken Tikka").notes("No onion")
                .quantity(1).unitPrice(BigDecimal.valueOf(300)).totalPrice(BigDecimal.valueOf(300)).build();
        var o = order("ORD-5555");
        o.getItems().add(item);
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).contains("No onion");
    }

    @Test
    @DisplayName("generateKotHtml: KOT heading (K O T) is always present")
    void generateKotHtml_kotHeadingPresent() {
        var o = order("ORD-4444", "Sweet Lassi");
        when(repo.findById(o.getId())).thenReturn(Optional.of(o));

        String html = kotService.generateKotHtml(o.getId());
        assertThat(html).containsIgnoringCase("KOT").containsIgnoringCase("AVIQR");
    }
}
