package in.aviqr.pms.entity;

/** GENERIC covers any ARI-compatible channel manager aggregator (SiteMinder,
 *  RateGain, etc.) that fronts multiple OTAs behind one feed — named channels are
 *  for a direct integration with that specific OTA. AXISROOMS is the AxisRooms
 *  channel manager, with AviQR registered on its side as the hotel's PMS — see
 *  AxisRoomsAriService (ARI push) and ChannelService#ingestBookingReal (bookings). */
public enum ChannelName {
    BOOKING_COM, MMT, AGODA, EXPEDIA, GENERIC, AXISROOMS
}
