package in.aviqr.security;

import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;

class SafeErrorMessagesTest {

    private final Logger log = LoggerFactory.getLogger(SafeErrorMessagesTest.class);

    @Test void businessMessagesPassThrough() {
        assertThat(SafeErrorMessages.forClient(new IllegalArgumentException("Room not checked in"), log)).isEqualTo("Room not checked in");
        assertThat(SafeErrorMessages.forClient(new IllegalStateException("Order already completed"), log)).isEqualTo("Order already completed");
        assertThat(SafeErrorMessages.forClient(new RuntimeException("Order not found"), log)).isEqualTo("Order not found");
    }

    @Test void databaseErrorsAreWithheld() {
        var ex = new DataIntegrityViolationException(
            "could not execute statement [ERROR: duplicate key value violates unique constraint \"orders_order_number_key\"]");
        String msg = SafeErrorMessages.forClient(ex, log);
        assertThat(msg).startsWith(SafeErrorMessages.GENERIC).contains("(ref ").doesNotContain("orders_order_number_key");
    }

    @Test void upstreamHttpErrorBodiesAreWithheld() {
        var ex = org.springframework.web.client.HttpClientErrorException.create(
            org.springframework.http.HttpStatus.UNAUTHORIZED, "Unauthorized", null,
            "{\"error\":\"invalid api key sk-live-123\"}".getBytes(), null);
        assertThat(SafeErrorMessages.forClient(ex, log)).doesNotContain("sk-live-123");
    }

    @Test void frameworkAndJdkErrorsAreWithheld() {
        assertThat(SafeErrorMessages.isUserFacing(new NullPointerException("Cannot invoke \"String.trim()\" because \"name\" is null"))).isFalse();
        assertThat(SafeErrorMessages.isUserFacing(new NumberFormatException("For input string: \"abc\""))).isFalse();
        assertThat(SafeErrorMessages.isUserFacing(new UnsupportedOperationException("nope"))).isFalse();
    }

    @Test void wrappedCauseIsWithheld() {
        var cause = new java.sql.SQLException("relation \"pms_guests\" does not exist");
        assertThat(SafeErrorMessages.isUserFacing(new RuntimeException(cause))).isFalse();
        // A wrapper with its own message still passes — the message is ours, not the cause's.
        assertThat(SafeErrorMessages.isUserFacing(new RuntimeException("Payment failed", cause))).isTrue();
    }

    @Test void blankMessagesAreWithheld() {
        assertThat(SafeErrorMessages.isUserFacing(new RuntimeException())).isFalse();
        assertThat(SafeErrorMessages.isUserFacing(new IllegalStateException(" "))).isFalse();
    }

    @Test void referenceIdsDiffer() {
        var ex = new NullPointerException();
        assertThat(SafeErrorMessages.forClient(ex, log)).isNotEqualTo(SafeErrorMessages.forClient(ex, log));
    }
}
