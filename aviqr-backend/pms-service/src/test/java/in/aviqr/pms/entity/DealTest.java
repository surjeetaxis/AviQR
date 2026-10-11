package in.aviqr.pms.entity;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DealTest {
    final LocalDate today = LocalDate.of(2026, 10, 10);

    Deal.DealBuilder deal() { return Deal.builder().name("D").valueType(ValueType.PERCENT).value(new BigDecimal("15")).active(true); }

    @Test
    void earlyBirdAndLastMinute() {
        Deal early = deal().minDaysAhead(30).build();
        assertThat(early.appliesTo(today.plusDays(30), today.plusDays(32), today)).isTrue();
        assertThat(early.appliesTo(today.plusDays(29), today.plusDays(31), today)).isFalse();
        Deal late = deal().maxDaysAhead(3).build();
        assertThat(late.appliesTo(today.plusDays(2), today.plusDays(3), today)).isTrue();
        assertThat(late.appliesTo(today.plusDays(4), today.plusDays(5), today)).isFalse();
    }

    @Test
    void windowsAndLength() {
        Deal season = deal().stayFrom(LocalDate.of(2026, 12, 1)).stayTo(LocalDate.of(2026, 12, 31)).bookTo(LocalDate.of(2026, 11, 30)).minNights(3).build();
        assertThat(season.appliesTo(LocalDate.of(2026, 12, 5), LocalDate.of(2026, 12, 8), today)).isTrue();
        assertThat(season.appliesTo(LocalDate.of(2026, 12, 5), LocalDate.of(2026, 12, 7), today)).isFalse();
        assertThat(season.appliesTo(LocalDate.of(2027, 1, 2), LocalDate.of(2027, 1, 6), today)).isFalse();
        assertThat(season.appliesTo(LocalDate.of(2026, 12, 5), LocalDate.of(2026, 12, 8), LocalDate.of(2026, 12, 1))).isFalse();
        assertThat(deal().active(false).build().appliesTo(today.plusDays(1), today.plusDays(2), today)).isFalse();
    }

    @Test
    void discountIsCapped() {
        assertThat(deal().build().discountOn(new BigDecimal("8000"))).isEqualByComparingTo("1200");
        assertThat(deal().valueType(ValueType.FIXED).value(new BigDecimal("9000")).build().discountOn(new BigDecimal("8000"))).isEqualByComparingTo("8000");
    }
}
