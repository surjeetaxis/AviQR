package in.aviqr.pms.entity;

/** What one channel sync-log row covers: an ARI push of one kind, or an inbound
 *  booking notification. Lets staff filter logs and sync each kind on its own. */
public enum SyncType { INVENTORY, RATES, RESTRICTIONS, BOOKING }
