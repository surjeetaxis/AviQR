package in.aviqr.pms.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import in.aviqr.pms.client.HotelInfoDto;
import in.aviqr.pms.client.HotelServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

/**
 * The booking assistant behind the website chat and WhatsApp: Claude answering a guest's
 * questions about one hotel with live rooms, prices and policies from the PMS, and sending a
 * booking link with the stay filled in. It never books or takes payment itself; the guest
 * finishes on the booking page, where terms and payment are handled.
 */
@Service @Slf4j
public class BookingAssistant {
    static final String MODEL = "claude-opus-5-5";
    static final int MAX_TOOL_ROUNDS = 6;
    public static final int MAX_TURNS = 20, MAX_CHARS = 1500;

    public record Turn(String role, String text) { }

    private final BookingAssistantTools tools;
    private final HotelServiceClient hotelServiceClient;
    private final AnthropicClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    public BookingAssistant(BookingAssistantTools tools, HotelServiceClient hotelServiceClient,
                            @Value("${anthropic.api-key:${ANTHROPIC_API_KEY:}}") String apiKey) {
        this.tools = tools;
        this.hotelServiceClient = hotelServiceClient;
        this.client = apiKey == null || apiKey.isBlank() ? null : AnthropicOkHttpClient.builder().apiKey(apiKey).build();
        if (client == null) log.info("Booking assistant is off: no ANTHROPIC_API_KEY");
    }

    public boolean available() { return client != null; }

    /** The assistant's reply to the last user turn. history alternates user/assistant and ends with the user. */
    public String reply(UUID hotelId, String storefrontBase, String channel, List<Turn> history) {
        if (client == null) return "Our booking assistant is offline right now. Please book on our website or call the hotel.";
        MessageCreateParams.Builder params = MessageCreateParams.builder()
            .model(MODEL)
            .maxTokens(16000L)
            // Chat replies: keep thinking short so guests aren't kept waiting.
            .outputConfig(OutputConfig.builder().effort(OutputConfig.Effort.LOW).build())
            .systemOfTextBlockParams(List.of(TextBlockParam.builder().text(systemPrompt(hotelId, channel))
                .cacheControl(CacheControlEphemeral.builder().build()).build()))
            // If a safety classifier declines, the API retries on a fallback model instead of stopping.
            .putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
            .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"));
        toolDefinitions().forEach(params::addTool);
        for (Turn t : trim(history)) {
            if ("assistant".equals(t.role())) params.addAssistantMessage(t.text());
            else params.addUserMessage(t.text());
        }
        try {
            for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
                Message response = client.messages().create(params.build());
                if (response.stopReason().map(r -> r.equals(StopReason.REFUSAL)).orElse(false))
                    return "Sorry, I can't help with that. I'm happy to help with rooms, prices and your stay.";
                List<ContentBlockParam> results = new ArrayList<>();
                for (ContentBlock block : response.content())
                    block.toolUse().ifPresent(use -> results.add(ContentBlockParam.ofToolResult(run(hotelId, storefrontBase, use))));
                if (results.isEmpty()) return text(response);
                params.addMessage(response);
                params.addUserMessageOfBlockParams(results);
            }
            return "Sorry, that took too long to look up. Could you ask again, maybe with your dates?";
        } catch (Exception e) {
            log.warn("Booking assistant failed for hotel {}: {}", hotelId, e.toString());
            return "Sorry, I couldn't answer just now. Please try again in a moment, or book on our website.";
        }
    }

    private ToolResultBlockParam run(UUID hotelId, String storefrontBase, ToolUseBlock use) {
        ToolResultBlockParam.Builder result = ToolResultBlockParam.builder().toolUseId(use.id());
        try {
            Map<String, Object> input = mapper.convertValue(use._input().convert(Object.class), new TypeReference<Map<String, Object>>() {});
            Object out = switch (use.name()) {
                case "check_availability" -> tools.availability(hotelId, input == null ? Map.of() : input);
                case "hotel_info" -> tools.hotelInfo(hotelId);
                case "booking_link" -> tools.bookingLink(hotelId, storefrontBase, input == null ? Map.of() : input);
                default -> throw new IllegalArgumentException("Unknown tool " + use.name());
            };
            return result.content(mapper.writeValueAsString(out)).build();
        } catch (Exception e) {
            return result.content("Error: " + e.getMessage()).isError(true).build();
        }
    }

    private String systemPrompt(UUID hotelId, String channel) {
        String hotel = hotelServiceClient.getAllActiveHotels().stream().filter(h -> hotelId.equals(h.getId()))
            .map(HotelInfoDto::getName).filter(Objects::nonNull).findFirst().orElse("the hotel");
        return """
            You are the booking assistant for %s, chatting with a guest on %s. Help them choose a stay and book it directly with the hotel.

            - Use check_availability for anything about rooms, availability or prices, and hotel_info for policies, payment, deals and loyalty. Quote only what the tools return, in INR, and say prices are before taxes.
            - When the guest is ready, or has dates and a room in mind, send a booking_link so they can pick the room, pay and confirm on the hotel's booking page. You can't book, hold rooms, take payment or change bookings yourself.
            - If dates are missing, ask for them. Assume %s is today; read relative dates ("this Friday") from it.
            - For existing bookings, cancellations, refunds or anything you can't look up, ask them to contact the hotel directly.
            - Keep replies short and friendly%s. Reply in the guest's language.
            """.formatted(hotel, "WHATSAPP".equals(channel) ? "WhatsApp" : "the hotel's website",
                LocalDate.now(DealService.HOTEL_ZONE), "WHATSAPP".equals(channel) ? ", in plain text without markdown tables" : "");
    }

    private static List<Tool> toolDefinitions() {
        Map<String, Object> date = Map.of("type", "string", "description", "YYYY-MM-DD");
        Map<String, Object> count = Map.of("type", "integer", "minimum", 0);
        return List.of(
            Tool.builder().name("check_availability")
                .description("Rooms and rate plans available for a stay, with live totals before tax, rooms left and cancellation terms.")
                .inputSchema(schema(Map.of("check_in", date, "check_out", date, "adults", count, "children", count), List.of("check_in", "check_out")))
                .build(),
            Tool.builder().name("hotel_info")
                .description("The hotel's house rules, cancellation policy, terms, how payment works, current deals and the loyalty program.")
                .inputSchema(schema(Map.of(), List.of()))
                .build(),
            Tool.builder().name("booking_link")
                .description("A link to the hotel's booking page with the stay filled in, for the guest to choose a room and book.")
                .inputSchema(schema(Map.of("check_in", date, "check_out", date, "adults", count, "children", count, "rooms", count),
                    List.of("check_in", "check_out")))
                .build());
    }

    private static Tool.InputSchema schema(Map<String, Object> properties, List<String> required) {
        Tool.InputSchema.Properties.Builder props = Tool.InputSchema.Properties.builder();
        properties.forEach((k, v) -> props.putAdditionalProperty(k, JsonValue.from(v)));
        return Tool.InputSchema.builder().properties(props.build()).required(required).build();
    }

    private static String text(Message response) {
        StringBuilder out = new StringBuilder();
        for (ContentBlock block : response.content()) block.text().ifPresent(t -> out.append(t.text()));
        String s = out.toString().strip();
        return s.isEmpty() ? "Could you tell me a little more about the stay you have in mind?" : s;
    }

    /** The latest turns, each capped, starting with a user turn. */
    static List<Turn> trim(List<Turn> history) {
        List<Turn> kept = new ArrayList<>();
        for (Turn t : history.subList(Math.max(0, history.size() - MAX_TURNS), history.size())) {
            if (t == null || t.text() == null || t.text().isBlank()) continue;
            String role = "assistant".equals(t.role()) ? "assistant" : "user";
            String text = t.text().length() > MAX_CHARS ? t.text().substring(0, MAX_CHARS) : t.text();
            if (!kept.isEmpty() && kept.get(kept.size() - 1).role().equals(role))
                kept.set(kept.size() - 1, new Turn(role, kept.get(kept.size() - 1).text() + "\n" + text));
            else kept.add(new Turn(role, text));
        }
        while (!kept.isEmpty() && !"user".equals(kept.get(0).role())) kept.remove(0);
        return kept;
    }
}
