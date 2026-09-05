package in.aviqr.pms.entity;

/** GENERIC covers any ARI-compatible channel manager aggregator (SiteMinder,
 *  RateGain, etc.) that fronts multiple OTAs behind one feed — named channels are
 *  for a direct integration with that specific OTA. */
public enum ChannelName {
    BOOKING_COM, MMT, AGODA, EXPEDIA, GENERIC
}
