package in.aviqr.order.dto;

import java.time.LocalDateTime;

public interface ScanEventRow {
    LocalDateTime getScannedAt();
    String getUserAgent();
    String getIpAddress();
    String getType();
    String getGroupParam();
    String getLabel();
}
