package in.aviqr.auth.dto;

import in.aviqr.auth.entity.Platform;
import lombok.Builder;
import lombok.Data;

// Captured once per login from client-sent headers (X-Platform, X-Device-Id,
// X-Device-Model, X-App-Version) plus the request itself (IP, User-Agent).
@Data @Builder
public class DeviceInfo {
    @Builder.Default
    Platform platform = Platform.UNKNOWN;
    String deviceId;
    String deviceModel;
    String appVersion;
    String ipAddress;
    String userAgent;
}
