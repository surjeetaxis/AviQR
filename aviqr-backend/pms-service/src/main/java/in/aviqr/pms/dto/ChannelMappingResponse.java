package in.aviqr.pms.dto;

import in.aviqr.pms.entity.ChannelMapping;
import in.aviqr.pms.entity.ChannelName;

import java.time.LocalDateTime;
import java.util.UUID;

/** API view of a channel mapping. Credentials are write-only; the generated generic
 *  webhook secret is returned only in the create response for initial configuration. */
public record ChannelMappingResponse(
    UUID id,
    UUID hotelId,
    UUID roomTypeId,
    ChannelName channel,
    String externalPropertyId,
    String externalRoomTypeId,
    String externalRatePlanId,
    UUID internalRatePlanId,
    String channelId,
    String cmBaseUrl,
    Boolean active,
    LocalDateTime createdAt,
    boolean hasAccessKey,
    String webhookSecret
) {
    public static ChannelMappingResponse from(ChannelMapping mapping, boolean includeWebhookSecret) {
        return new ChannelMappingResponse(mapping.getId(), mapping.getHotelId(), mapping.getRoomTypeId(),
            mapping.getChannel(), mapping.getExternalPropertyId(), mapping.getExternalRoomTypeId(),
            mapping.getExternalRatePlanId(), mapping.getInternalRatePlanId(), mapping.getChannelId(),
            mapping.getCmBaseUrl(), mapping.getActive(), mapping.getCreatedAt(), mapping.isHasAccessKey(),
            includeWebhookSecret ? mapping.getWebhookSecret() : null);
    }
}
