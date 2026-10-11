package in.aviqr.pms.service;

import in.aviqr.pms.dto.PublicBookingPolicies;
import in.aviqr.pms.dto.PublicPaymentOptions;
import in.aviqr.pms.entity.MealPlan;
import in.aviqr.pms.entity.RatePlan;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.RatePlanRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BookingAssistantToolsTest {
    final RoomTypeRepository roomTypes = mock(RoomTypeRepository.class);
    final RatePlanRepository ratePlans = mock(RatePlanRepository.class);
    final AvailabilityService availability = mock(AvailabilityService.class);
    final RatePlanService rates = mock(RatePlanService.class);
    final PublicBookingService booking = mock(PublicBookingService.class);
    final OnlineBookingPaymentService payments = mock(OnlineBookingPaymentService.class);
    final DealService deals = mock(DealService.class);
    final BookingLoyaltyService loyalty = mock(BookingLoyaltyService.class);
    final BookingAssistantTools tools = new BookingAssistantTools(roomTypes, ratePlans, availability, rates, booking, payments, deals, loyalty);
    final UUID hotel = UUID.randomUUID();
    final LocalDate in = LocalDate.now().plusDays(10), out = in.plusDays(2);

    @Test
    @SuppressWarnings("unchecked")
    void availabilityHasLivePricesAndSkipsRestrictedOrFullRooms() {
        RoomType deluxe = RoomType.builder().id(UUID.randomUUID()).hotelId(hotel).name("Deluxe").maxOccupancy(2).active(true).build();
        RoomType suite = RoomType.builder().id(UUID.randomUUID()).hotelId(hotel).name("Suite").maxOccupancy(3).active(true).build();
        RatePlan flex = RatePlan.builder().id(UUID.randomUUID()).roomTypeId(deluxe.getId()).name("Flexible").mealPlan(MealPlan.values()[0]).active(true).build();
        RatePlan minStay = RatePlan.builder().id(UUID.randomUUID()).roomTypeId(deluxe.getId()).name("Min 3 nights").active(true).build();
        when(roomTypes.findByHotelIdAndActiveTrue(hotel)).thenReturn(List.of(deluxe, suite));
        when(availability.availableCount(hotel, deluxe.getId(), in, out)).thenReturn(3);
        when(availability.availableCount(hotel, suite.getId(), in, out)).thenReturn(0);
        when(ratePlans.findByRoomTypeIdAndActiveTrue(deluxe.getId())).thenReturn(List.of(flex, minStay));
        doThrow(new RuntimeException("min stay")).when(rates).validateStay(minStay.getId(), in, out);
        when(rates.totalForStay(flex.getId(), in, out)).thenReturn(new BigDecimal("8000"));
        Map<String, Object> result = tools.availability(hotel, Map.of("check_in", in.toString(), "check_out", out.toString(), "adults", 2));
        List<Map<String, Object>> rooms = (List<Map<String, Object>>) result.get("rooms");
        assertThat(rooms).hasSize(1);
        assertThat(rooms.get(0)).containsEntry("room_type", "Deluxe").containsEntry("rooms_left", 3);
        List<Map<String, Object>> plans = (List<Map<String, Object>>) rooms.get(0).get("rates");
        assertThat(plans).singleElement().satisfies(p -> {
            assertThat(p).containsEntry("rate", "Flexible");
            assertThat((BigDecimal) p.get("per_night_inr")).isEqualByComparingTo("4000");
        });
        assertThat(tools.availability(hotel, Map.of("check_in", LocalDate.now().minusDays(1).toString(), "check_out", out.toString()))).containsKey("error");
        assertThatThrownBy(() -> tools.availability(hotel, Map.of("check_in", "next friday", "check_out", out.toString()))).hasMessageContaining("YYYY-MM-DD");
    }

    @Test
    void infoAndLink() {
        when(booking.policies(hotel)).thenReturn(new PublicBookingPolicies("No pets", "Free cancellation 48h before", null, false));
        when(payments.options(hotel)).thenReturn(new PublicPaymentOptions("REQUIRED", 30, "Razorpay"));
        when(deals.live(hotel)).thenReturn(List.of());
        when(loyalty.program(hotel)).thenReturn(new BookingLoyaltyService.Program(false, BigDecimal.ZERO, BigDecimal.ONE));
        assertThat(tools.hotelInfo(hotel)).containsEntry("house_rules", "No pets").containsEntry("payment", "A 30% deposit is paid online at booking; the rest at the hotel");
        assertThat(tools.bookingLink(hotel, "https://book.example/", Map.of("check_in", in.toString(), "check_out", out.toString(), "adults", 3, "rooms", 20)))
            .containsEntry("url", "https://book.example/#/stay/" + hotel + "?in=" + in + "&out=" + out + "&adults=3&children=0&rooms=9");
    }
}
