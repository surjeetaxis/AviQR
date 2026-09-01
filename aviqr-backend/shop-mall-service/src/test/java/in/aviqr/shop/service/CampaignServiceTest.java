package in.aviqr.shop.service;

import in.aviqr.shop.dto.ApiResponse;
import in.aviqr.shop.dto.NearbyCustomerDto;
import in.aviqr.shop.entity.Campaign;
import in.aviqr.shop.entity.CampaignAudienceType;
import in.aviqr.shop.entity.CampaignChannel;
import in.aviqr.shop.entity.CampaignLog;
import in.aviqr.shop.entity.CampaignStatus;
import in.aviqr.shop.entity.Shop;
import in.aviqr.shop.entity.ShopPromotion;
import in.aviqr.shop.repository.CampaignLogRepository;
import in.aviqr.shop.repository.CampaignRepository;
import in.aviqr.shop.repository.CustomerRepository;
import in.aviqr.shop.repository.LoyaltyAccountRepository;
import in.aviqr.shop.repository.ShopPromotionRepository;
import in.aviqr.shop.repository.ShopRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the NEARBY-audience / EMAIL-channel campaign flow end to end
 * (minus the two other services it talks to over the wire): shop lookup ->
 * simulated auth-service nearby-customers response -> promotion email
 * dispatch through the simulated notification-report-review-service call.
 */
@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class CampaignServiceTest {

    private static final String NEARBY_URL = "http://auth-service/api/v1/auth/internal/nearby-customers";
    private static final String EMAIL_URL = "http://notification-report-review-service/api/v1/notifications/email/send";

    @Mock CampaignRepository campaignRepo;
    @Mock CampaignLogRepository logRepo;
    @Mock CustomerRepository customerRepo;
    @Mock LoyaltyAccountRepository loyaltyRepo;
    @Mock ShopRepository shopRepo;
    @Mock ShopPromotionRepository promotionRepo;
    @Mock RestTemplate restTemplate;

    private CampaignService service;
    private Shop shop;
    private Campaign campaign;

    @BeforeEach
    void setUp() {
        service = new CampaignService(campaignRepo, logRepo, customerRepo, loyaltyRepo, shopRepo, promotionRepo, restTemplate);
        ReflectionTestUtils.setField(service, "internalSyncSecret", "");

        UUID shopId = UUID.randomUUID();
        shop = Shop.builder()
            .id(shopId)
            .name("Cafe Aroma")
            .latitude(12.9716)
            .longitude(77.5946)
            .build();

        campaign = Campaign.builder()
            .id(UUID.randomUUID())
            .shopId(shopId.toString())
            .name("Diwali Sale")
            .subject("Hey {name}, a treat is waiting!")
            .messageTemplate("Hi {name}, enjoy a special offer at our store.")
            .audienceType(CampaignAudienceType.NEARBY)
            .radiusKm(5.0)
            .channel(CampaignChannel.EMAIL)
            .status(CampaignStatus.DRAFT)
            .build();

        when(campaignRepo.findById(campaign.getId())).thenReturn(Optional.of(campaign));
        when(campaignRepo.save(any(Campaign.class))).thenAnswer(inv -> inv.getArgument(0));
        when(shopRepo.findById(shopId)).thenReturn(Optional.of(shop));
    }

    @Test
    @DisplayName("emails every nearby customer with an address on file, and marks the rest FAILED")
    void sendsPromotionEmailToNearbyCustomersWithAnEmail() {
        stubNearbyLookup(nearbyDto("Asha", "asha@example.com", "9900011122"),
                          nearbyDto("Ravi", null, "9900033344"));
        stubEmailSend(true);
        ShopPromotion promo = ShopPromotion.builder()
            .shopId(shop.getId().toString()).code("WELCOME10").label("10% OFF").build();
        when(promotionRepo.findByShopIdAndActiveTrue(shop.getId().toString())).thenReturn(List.of(promo));

        Campaign result = service.sendNow(campaign.getId());

        assertThat(result.getStatus()).isEqualTo(CampaignStatus.SENT);
        assertThat(result.getSentCount()).isEqualTo(1);
        assertThat(result.getFailedCount()).isEqualTo(1);

        ArgumentCaptor<HttpEntity<Map<String, String>>> emailRequest = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq(EMAIL_URL), eq(HttpMethod.POST), emailRequest.capture(), any(ParameterizedTypeReference.class));
        Map<String, String> body = emailRequest.getValue().getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("to")).isEqualTo("asha@example.com");
        assertThat(body.get("subject")).isEqualTo("Hey Asha, a treat is waiting!");
        assertThat(body.get("htmlBody"))
            .contains("Cafe Aroma")
            .contains("WELCOME10")
            .contains("10% OFF")
            .contains("Hi Asha, enjoy a special offer at our store.");

        ArgumentCaptor<CampaignLog> logs = ArgumentCaptor.forClass(CampaignLog.class);
        verify(logRepo, org.mockito.Mockito.times(2)).save(logs.capture());
        assertThat(logs.getAllValues()).anySatisfy(l -> {
            assertThat(l.getCustomerEmail()).isEqualTo("asha@example.com");
            assertThat(l.getStatus()).isEqualTo("SENT");
        });
        assertThat(logs.getAllValues()).anySatisfy(l -> {
            assertThat(l.getCustomerName()).isEqualTo("Ravi");
            assertThat(l.getStatus()).isEqualTo("FAILED");
            assertThat(l.getErrorMessage()).isEqualTo("No email on file");
        });
    }

    @Test
    @DisplayName("skips the auth-service lookup entirely when the shop has no lat/lng set")
    void skipsWhenShopHasNoLocation() {
        shop.setLatitude(null);
        shop.setLongitude(null);

        Campaign result = service.sendNow(campaign.getId());

        assertThat(result.getSentCount()).isZero();
        assertThat(result.getFailedCount()).isZero();
        verify(restTemplate, never()).exchange(startsWith(NEARBY_URL), any(HttpMethod.class), any(HttpEntity.class), any(ParameterizedTypeReference.class));
        verify(logRepo, never()).save(any());
    }

    @Test
    @DisplayName("marks every recipient FAILED when the email-send call itself fails, without blowing up the campaign")
    void marksFailedWhenEmailSendCallFails() {
        stubNearbyLookup(nearbyDto("Asha", "asha@example.com", "9900011122"));
        stubEmailSend(false);

        Campaign result = service.sendNow(campaign.getId());

        assertThat(result.getSentCount()).isZero();
        assertThat(result.getFailedCount()).isEqualTo(1);
        verify(logRepo).save(org.mockito.ArgumentMatchers.argThat(l -> "FAILED".equals(l.getStatus())));
    }

    private NearbyCustomerDto nearbyDto(String name, String email, String phone) {
        NearbyCustomerDto dto = new NearbyCustomerDto();
        dto.setName(name);
        dto.setEmail(email);
        dto.setPhone(phone);
        dto.setDistanceKm(1.5);
        return dto;
    }

    private void stubNearbyLookup(NearbyCustomerDto... customers) {
        ResponseEntity<ApiResponse<NearbyCustomerDto[]>> response = ResponseEntity.ok(ApiResponse.ok(customers));
        doReturn(response).when(restTemplate).exchange(
            startsWith(NEARBY_URL), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }

    private void stubEmailSend(boolean success) {
        ApiResponse<Boolean> body = success ? ApiResponse.ok(true) : ApiResponse.error("send failed");
        ResponseEntity<ApiResponse<Boolean>> response = ResponseEntity.ok(body);
        doReturn(response).when(restTemplate).exchange(
            eq(EMAIL_URL), eq(HttpMethod.POST), any(HttpEntity.class), any(ParameterizedTypeReference.class));
    }
}
