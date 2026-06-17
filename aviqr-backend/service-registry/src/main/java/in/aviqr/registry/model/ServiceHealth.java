package in.aviqr.registry.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceHealth {

    private String name;
    private String displayName;
    private String emoji;
    private String description;
    private String status;           // UP, DOWN, UNKNOWN
    private int instanceCount;
    private List<InstanceInfo> instances;
    private String category;         // INFRA, CORE, BUSINESS, SUPPORT
    private int port;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstanceInfo {
        private String instanceId;
        private String hostName;
        private int port;
        private String status;
        private String healthUrl;
        private String homePageUrl;
        private Map<String, Object> healthDetails;
        private String upSince;
        private long uptimeSeconds;
        private String lastUpdated;
    }
}
