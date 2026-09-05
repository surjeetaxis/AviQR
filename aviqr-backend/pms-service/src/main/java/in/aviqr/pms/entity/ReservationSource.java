package in.aviqr.pms.entity;

public enum ReservationSource {
    DIRECT, WALK_IN, PHONE, OTA, AGENT,
    // Bulk-imported from a hotel's prior system — see ReservationImportService.
    IMPORTED
}
