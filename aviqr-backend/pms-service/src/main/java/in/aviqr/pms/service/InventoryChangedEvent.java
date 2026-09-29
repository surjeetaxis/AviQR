package in.aviqr.pms.service;

import java.util.Set;
import java.util.UUID;

/** A reservation change that alters how many rooms of these types are sellable
 *  (new booking, cancellation, no-show, early checkout, stay extension). Published
 *  by ReservationService; ChannelService pushes fresh availability to connected
 *  channel managers once the change has committed. */
public record InventoryChangedEvent(UUID hotelId, Set<UUID> roomTypeIds) {}
