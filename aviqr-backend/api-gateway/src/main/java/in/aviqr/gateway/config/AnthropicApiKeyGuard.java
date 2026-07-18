package in.aviqr.gateway.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Refuses to start under the "production" profile if ANTHROPIC_API_KEY is
 * unset. Without this, the AI proxy route (routes[20], /api/v1/ai/**) silently
 * forwards the literal header "x-api-key: not-configured" to Anthropic —
 * every one of the 11 AI Hub features fails with a 401 instead of the gateway
 * refusing to come up.
 */
@Component
@Profile("production")
public class AnthropicApiKeyGuard {

    @Value("${ANTHROPIC_API_KEY:not-configured}")
    private String anthropicApiKey;

    @PostConstruct
    public void verifyKeyConfigured() {
        if (anthropicApiKey == null || anthropicApiKey.isBlank() || anthropicApiKey.equals("not-configured")) {
            throw new IllegalStateException(
                "Refusing to start api-gateway under the 'production' profile without ANTHROPIC_API_KEY set. " +
                "All 11 AI Hub features (admin assistant, analytics, recommendations, etc.) proxy through " +
                "/api/v1/ai/** to Anthropic using this key — set ANTHROPIC_API_KEY in the environment.");
        }
    }
}
