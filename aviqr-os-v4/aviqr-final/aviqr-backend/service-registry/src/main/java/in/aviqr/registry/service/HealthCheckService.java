package in.aviqr.registry.service;

import com.netflix.appinfo.InstanceInfo;
import com.netflix.discovery.shared.Application;
import com.netflix.eureka.EurekaServerContext;
import com.netflix.eureka.EurekaServerContextHolder;
import com.netflix.eureka.registry.PeerAwareInstanceRegistry;
import in.aviqr.registry.model.DashboardSummary;
import in.aviqr.registry.model.ServiceHealth;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Slf4j
public class HealthCheckService {

    private final RestTemplate restTemplate;
    private final long startTime = System.currentTimeMillis();

    // Service metadata: name → [emoji, displayName, description, category]
    private static final Map<String, String[]> SERVICE_META = new LinkedHashMap<>();

    static {
        SERVICE_META.put("api-gateway",           new String[]{"🔀", "API Gateway",           "Routes all client requests, JWT validation, rate limiting",    "INFRA"});
        SERVICE_META.put("auth-service",          new String[]{"🔐", "Auth Service",           "Registration, login, OTP, JWT tokens, user management",       "CORE"});
        SERVICE_META.put("shop-service",          new String[]{"🏪", "Shop Service",           "Shop CRUD, staff management, settings, opening hours",        "BUSINESS"});
        SERVICE_META.put("menu-service",          new String[]{"🍽️", "Menu Service",           "Categories, items, dynamic pricing engine (9 languages)",     "BUSINESS"});
        SERVICE_META.put("order-service",         new String[]{"📦", "Order Service",          "Order placement, Kanban live feed, status tracking",          "BUSINESS"});
        SERVICE_META.put("payment-service",       new String[]{"💳", "Payment Service",        "Razorpay integration, verify signatures, refunds",            "BUSINESS"});
        SERVICE_META.put("qr-service",            new String[]{"📱", "QR Service",             "Generate QR codes, redirect tracking, PNG download",          "BUSINESS"});
        SERVICE_META.put("notification-service",  new String[]{"🔔", "Notification Service",   "Push notifications, SMS, WhatsApp, RabbitMQ consumer",        "SUPPORT"});
        SERVICE_META.put("hotel-service",         new String[]{"🏨", "Hotel Service",          "Hotels, rooms, guest requests, housekeeping, laundry",        "BUSINESS"});
        SERVICE_META.put("mall-service",          new String[]{"🏬", "Mall Service",           "Mall management, vendors, revenue share, food courts",        "BUSINESS"});
        SERVICE_META.put("support-service",       new String[]{"🎫", "Support Service",        "Tickets, priorities, impersonation logs, agent assignment",   "SUPPORT"});
        SERVICE_META.put("report-service",        new String[]{"📊", "Report Service",         "Revenue reports, peak hours, top items, platform stats",      "SUPPORT"});
        SERVICE_META.put("ocr-service",           new String[]{"🔍", "OCR Service",            "Menu image/PDF upload, AI extraction, async processing",      "SUPPORT"});
    }

    public HealthCheckService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(3000);
        this.restTemplate = new RestTemplate(factory);
    }

    public DashboardSummary buildSummary() {
        List<ServiceHealth> services = new ArrayList<>();
        List<String> alerts = new ArrayList<>();

        for (Map.Entry<String, String[]> entry : SERVICE_META.entrySet()) {
            String serviceName = entry.getKey();
            String[] meta = entry.getValue();
            ServiceHealth health = buildServiceHealth(serviceName, meta);
            services.add(health);

            if ("DOWN".equals(health.getStatus())) {
                alerts.add("⚠️ " + meta[1] + " is DOWN — no instances registered");
            }
        }

        long upCount      = services.stream().filter(s -> "UP".equals(s.getStatus())).count();
        long downCount    = services.stream().filter(s -> "DOWN".equals(s.getStatus())).count();
        long unknownCount = services.stream().filter(s -> "UNKNOWN".equals(s.getStatus())).count();
        int  totalInstances = services.stream().mapToInt(ServiceHealth::getInstanceCount).sum();

        String overall;
        if (downCount == 0 && unknownCount == 0) {
            overall = "HEALTHY";
        } else if (downCount > 0 && downCount < services.size() / 2) {
            overall = "DEGRADED";
        } else {
            overall = "CRITICAL";
        }

        if (alerts.isEmpty()) {
            alerts.add("✅ All " + upCount + " services are healthy and running");
        }

        return DashboardSummary.builder()
                .totalServices(services.size())
                .upServices((int) upCount)
                .downServices((int) downCount)
                .unknownServices((int) unknownCount)
                .totalInstances(totalInstances)
                .overallStatus(overall)
                .lastRefreshed(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm:ss")))
                .serverUptime(formatUptime(System.currentTimeMillis() - startTime))
                .services(services)
                .alerts(alerts)
                .build();
    }

    private ServiceHealth buildServiceHealth(String serviceName, String[] meta) {
        List<ServiceHealth.InstanceInfo> instances = getEurekaInstances(serviceName);

        String status;
        if (instances.isEmpty()) {
            status = "DOWN";
        } else if (instances.stream().anyMatch(i -> "UP".equals(i.getStatus()))) {
            status = "UP";
        } else {
            status = "UNKNOWN";
        }

        return ServiceHealth.builder()
                .name(serviceName)
                .emoji(meta[0])
                .displayName(meta[1])
                .description(meta[2])
                .category(meta[3])
                .status(status)
                .instanceCount(instances.size())
                .instances(instances)
                .build();
    }

    /**
     * Fetch registered instances from Eureka's in-memory registry.
     * Uses Application.getInstances() — the correct API for Spring Cloud Netflix 4.x
     */
    private List<ServiceHealth.InstanceInfo> getEurekaInstances(String serviceName) {
        List<ServiceHealth.InstanceInfo> result = new ArrayList<>();
        try {
            EurekaServerContext ctx = EurekaServerContextHolder.getInstance().getServerContext();
            PeerAwareInstanceRegistry registry = ctx.getRegistry();

            // getApplication(name) is the correct method — NOT getInstancesByVirtualHostName
            Application application = registry.getApplication(serviceName.toUpperCase());
            if (application == null || application.getInstances() == null) {
                return result;
            }

            for (InstanceInfo inst : application.getInstances()) {
                String homeUrl = inst.getHomePageUrl();
                if (homeUrl != null && !homeUrl.endsWith("/")) homeUrl += "/";
                String healthUrl = homeUrl != null ? homeUrl + "actuator/health" : "";

                Map<String, Object> healthDetails = healthUrl.isBlank()
                        ? Map.of("status", "UNKNOWN")
                        : fetchHealth(healthUrl);

                String instanceStatus = resolveStatus(inst, healthDetails);

                long uptimeSec = inst.getLastUpdatedTimestamp() > 0
                        ? (System.currentTimeMillis() - inst.getLastUpdatedTimestamp()) / 1000
                        : 0;

                result.add(ServiceHealth.InstanceInfo.builder()
                        .instanceId(inst.getInstanceId())
                        .hostName(inst.getHostName())
                        .port(inst.getPort())
                        .status(instanceStatus)
                        .healthUrl(healthUrl)
                        .homePageUrl(homeUrl != null ? homeUrl : "")
                        .healthDetails(healthDetails)
                        .upSince(formatUptime(uptimeSec * 1000))
                        .uptimeSeconds(uptimeSec)
                        .lastUpdated(new Date(inst.getLastUpdatedTimestamp()).toString())
                        .build());
            }
        } catch (Exception e) {
            log.debug("Could not fetch instances for {}: {}", serviceName, e.getMessage());
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchHealth(String url) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.debug("Health check failed for {}: {}", url, e.getMessage());
        }
        return Map.of("status", "UNKNOWN");
    }

    private String resolveStatus(InstanceInfo inst, Map<String, Object> healthDetails) {
        if (inst.getStatus() != InstanceInfo.InstanceStatus.UP) return "DOWN";
        Object status = healthDetails.get("status");
        if ("UP".equals(status))   return "UP";
        if ("DOWN".equals(status)) return "DOWN";
        return "UNKNOWN";
    }

    private String formatUptime(long millis) {
        if (millis <= 0) return "just started";
        long seconds = millis / 1000;
        long days    = seconds / 86400;
        long hours   = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs    = seconds % 60;

        if (days > 0)    return days + "d " + hours + "h " + minutes + "m";
        if (hours > 0)   return hours + "h " + minutes + "m " + secs + "s";
        if (minutes > 0) return minutes + "m " + secs + "s";
        return secs + "s";
    }
}
