package in.aviqr.hotel.dto;

import in.aviqr.hotel.entity.BookingEngineVisibility;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BookingEngineSettingsUpdate(
    @NotNull Boolean enabled,
    @NotNull BookingEngineVisibility visibility,
    @Size(max=100) String brandName,
    @Pattern(regexp="^#[0-9A-Fa-f]{6}$") String primaryColor,
    @Pattern(regexp="^#[0-9A-Fa-f]{6}$") String accentColor,
    @Size(max=1000) @Pattern(regexp="^(https://.*)?$") String logoUrl,
    @Pattern(regexp="^[a-z0-9]+(?:-[a-z0-9]+)*$") @Size(max=63) String slug,
    @Size(max=253) @Pattern(regexp="^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,63}$") String customDomain,
    @Size(max=254) String supportEmail
) {}
