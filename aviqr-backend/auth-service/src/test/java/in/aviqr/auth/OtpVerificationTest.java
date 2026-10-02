package in.aviqr.auth;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.OtpRepository;
import in.aviqr.auth.service.OtpVerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class OtpVerificationTest {
    @Test void onlyFiveAttemptsAreAllowedAndExhaustedCodeIsInvalidated() {
        var repository=mock(OtpRepository.class);var encoder=mock(PasswordEncoder.class);
        var record=OtpRecord.builder().otp("hash").build();
        when(repository.findByTargetAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(eq("a@example.com"),eq(OtpType.EMAIL_LOGIN),any())).thenReturn(List.of(record));
        var service=new OtpVerificationService(repository,encoder);
        for(int i=0;i<6;i++) assertThat(service.verify("a@example.com",OtpType.EMAIL_LOGIN,"000000")).isFalse();
        assertThat(record.getFailedAttempts()).isEqualTo(5);assertThat(record.getUsed()).isTrue();verify(encoder,times(5)).matches(anyString(),anyString());
    }
    @Test void olderCodesCannotBeUsedAfterANewCodeIsIssued() {
        var repository=mock(OtpRepository.class);var encoder=mock(PasswordEncoder.class);
        var latest=OtpRecord.builder().otp("new").build();var old=OtpRecord.builder().otp("old").build();
        when(repository.findByTargetAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(),any(),any())).thenReturn(List.of(latest,old));
        assertThat(new OtpVerificationService(repository,encoder).verify("a@example.com",OtpType.EMAIL_LOGIN,"123456")).isFalse();
        verify(encoder,never()).matches(anyString(),eq("old"));assertThat(old.getFailedAttempts()).isZero();
    }
    @Test void validCodeIsConsumed() {
        var repository=mock(OtpRepository.class);var encoder=mock(PasswordEncoder.class);
        var record=OtpRecord.builder().otp("hash").build();
        when(repository.findByTargetAndTypeAndUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(any(),any(),any())).thenReturn(List.of(record));
        when(encoder.matches("123456","hash")).thenReturn(true);
        assertThat(new OtpVerificationService(repository,encoder).verify("a@example.com",OtpType.PASSWORD_RESET,"123456")).isTrue();
        assertThat(record.getUsed()).isTrue();
    }
}
