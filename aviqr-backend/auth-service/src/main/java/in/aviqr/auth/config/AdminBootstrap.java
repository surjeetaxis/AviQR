package in.aviqr.auth.config;
import in.aviqr.auth.entity.*;
import in.aviqr.auth.repository.UserRepository;
import in.aviqr.auth.service.LoginSecurityService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
@Component @RequiredArgsConstructor
public class AdminBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;
    @Value("${BOOTSTRAP_ADMIN_EMAIL:}") private String email;
    @Value("${BOOTSTRAP_ADMIN_PASSWORD:}") private String password;
    @Override @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() && password.isBlank()) return;
        // PostgreSQL advisory transaction lock prevents duplicate bootstrap across replicas.
        jdbc.execute("SELECT pg_advisory_xact_lock(6886001)");
        if (users.countByRole(UserRole.ADMIN)>0) return;
        LoginSecurityService.validatePassword(password);
        String normalized=email.trim().toLowerCase(Locale.ROOT);
        if (!normalized.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new IllegalStateException("Valid BOOTSTRAP_ADMIN_EMAIL required");
        if (users.existsByEmail(normalized)) throw new IllegalStateException("Bootstrap email is already in use");
        users.save(User.builder().name("Administrator").email(normalized).passwordHash(encoder.encode(password))
            .role(UserRole.ADMIN).status(UserStatus.ACTIVE).preferredLanguage("en").build());
    }
}
