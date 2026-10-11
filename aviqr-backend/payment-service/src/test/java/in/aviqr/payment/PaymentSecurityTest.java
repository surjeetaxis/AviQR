package in.aviqr.payment;
import in.aviqr.payment.controller.PaymentController;
import in.aviqr.payment.repository.PaymentRepository;
import in.aviqr.payment.entity.*;
import in.aviqr.payment.dto.PaymentVerifyRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import java.math.BigDecimal;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class PaymentSecurityTest {
 private static final String SECRET="test-only-hmac-secret-at-least-32-characters";
 private static final String SHOP_ID="117390e3-f3dc-4ea7-a6e2-1b073f18bad7";
 private PaymentController controller(PaymentRepository repo){var restTemplate=mock(RestTemplate.class);var data=Map.of("onlineEnabled",true,"keyId","rzp_test_1234567890","keySecret",SECRET,"webhookSecret",SECRET);var response=Map.of("data",data);when(restTemplate.exchange(eq("http://shop-mall-service/api/v1/settings/internal/shop/"+SHOP_ID+"/payment-credentials"),eq(HttpMethod.GET),any(HttpEntity.class),eq(Map.class))).thenReturn(new ResponseEntity<>(response,HttpStatus.OK));var c=new PaymentController(repo,restTemplate);ReflectionTestUtils.setField(c,"internalSyncSecret","test-only-internal-secret");return c;}
 private Payment payment(PaymentStatus status){return Payment.builder().orderId("order-1").razorpayOrderId("rzp-order-1").paymentId("pay-1").shopId(SHOP_ID).customerId("customer-1").amount(new BigDecimal("100.00")).currency("INR").status(status).targetType(PaymentTargetType.ORDER).build();}
 private String signature(String value)throws Exception{var mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));}
 private PaymentVerifyRequest request()throws Exception{var req=new PaymentVerifyRequest();req.setOrderId("order-1");req.setRazorpayOrderId("rzp-order-1");req.setRazorpayPaymentId("pay-1");req.setRazorpaySignature(signature("rzp-order-1|pay-1"));return req;}
 @Test void validSignatureCannotResurrectRefundedPayment()throws Exception{var repo=mock(PaymentRepository.class);var payment=payment(PaymentStatus.REFUNDED);when(repo.lockByRazorpayOrderId("rzp-order-1")).thenReturn(Optional.of(payment));assertThat(controller(repo).verify(request(),"customer-1","CUSTOMER","","").getStatusCode().value()).isEqualTo(409);assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUNDED);verify(repo,never()).save(any());}
 @Test void invalidSignatureAndCrossCustomerAccessNeverAlterPayment()throws Exception{var repo=mock(PaymentRepository.class);when(repo.lockByRazorpayOrderId("rzp-order-1")).thenReturn(Optional.of(payment(PaymentStatus.PENDING)));var c=controller(repo);assertThat(c.verify(request(),"customer-2","CUSTOMER","","").getStatusCode().value()).isEqualTo(403);var req=request();req.setRazorpaySignature("invalid");assertThat(c.verify(req,"customer-1","CUSTOMER","","").getStatusCode().value()).isEqualTo(400);verify(repo,never()).save(any());}
 @Test void staleFailedAndCapturedWebhooksCannotDowngradeOrRevivePayment()throws Exception{var repo=mock(PaymentRepository.class);var payment=payment(PaymentStatus.CAPTURED);when(repo.findByRazorpayOrderId("rzp-order-1")).thenReturn(Optional.of(payment));when(repo.lockByRazorpayOrderId("rzp-order-1")).thenReturn(Optional.of(payment));var c=controller(repo);String failed="{\"event\":\"payment.failed\",\"payload\":{\"payment\":{\"entity\":{\"order_id\":\"rzp-order-1\",\"id\":\"pay-1\"}}}}";assertThat(c.webhook(failed,signature(failed)).getStatusCode().value()).isEqualTo(200);assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CAPTURED);payment.setStatus(PaymentStatus.REFUNDED);String captured=failed.replace("payment.failed","payment.captured");c.webhook(captured,signature(captured));assertThat(payment.getStatus()).isEqualTo(PaymentStatus.REFUNDED);verify(repo,never()).save(any());}
}
