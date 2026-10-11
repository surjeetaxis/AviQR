package in.aviqr.hotel.dto;

import in.aviqr.hotel.entity.BookingEngineVisibility;
import java.util.UUID;

public record BookingEngineSettingsResponse(
    UUID hotelId,
    boolean enabled,
    BookingEngineVisibility visibility,
    String brandName,
    String primaryColor,
    String accentColor,
    String logoUrl,
    String slug,
    String customDomain,
    String supportEmail,
    String hostedUrl,
    String customDomainUrl,
    String bookingApi
) {}
