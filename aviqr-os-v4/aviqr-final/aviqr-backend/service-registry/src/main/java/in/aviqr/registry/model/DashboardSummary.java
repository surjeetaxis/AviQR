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
public class DashboardSummary {

    private int totalServices;
    private int upServices;
    private int downServices;
    private int unknownServices;
    private int totalInstances;
    private String overallStatus;        // HEALTHY, DEGRADED, CRITICAL
    private String lastRefreshed;
    private String serverUptime;
    private Map<String, Long> instancesByStatus;
    private List<ServiceHealth> services;
    private List<String> alerts;
    private long totalOrdersProcessed;
    private long activeConnections;
}
