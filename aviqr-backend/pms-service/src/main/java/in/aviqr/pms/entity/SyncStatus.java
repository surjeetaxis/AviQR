package in.aviqr.pms.entity;

/** SKIPPED: the channel manager accepted the call but had nothing to apply it to
 *  (e.g. AxisRooms' "no ota connected" for restrictions) — not an error on our side,
 *  but nothing was stored either, so it's neither SUCCESS nor FAILED. */
public enum SyncStatus { SUCCESS, FAILED, SKIPPED }
