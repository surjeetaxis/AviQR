package in.aviqr.registry.controller;

import in.aviqr.registry.model.DashboardSummary;
import in.aviqr.registry.model.ServiceHealth;
import in.aviqr.registry.service.HealthCheckService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
@RequiredArgsConstructor
public class DashboardController {

    private final HealthCheckService healthCheckService;

    // ── Main health dashboard ─────────────────────────────────────────────────
    // REMOVED "/" from mappings to avoid conflict with Eureka's EurekaController
    // Use /health or /dashboard — both work
    @GetMapping({"/health", "/dashboard"})
    public String dashboard(Model model) {
        DashboardSummary summary = healthCheckService.buildSummary();
        model.addAttribute("summary", summary);

        Map<String, List<ServiceHealth>> grouped = new LinkedHashMap<>();
        grouped.put("INFRA",    summary.getServices().stream().filter(s -> "INFRA".equals(s.getCategory())).toList());
        grouped.put("CORE",     summary.getServices().stream().filter(s -> "CORE".equals(s.getCategory())).toList());
        grouped.put("BUSINESS", summary.getServices().stream().filter(s -> "BUSINESS".equals(s.getCategory())).toList());
        grouped.put("SUPPORT",  summary.getServices().stream().filter(s -> "SUPPORT".equals(s.getCategory())).toList());
        model.addAttribute("grouped", grouped);

        return "dashboard";
    }

    // ── JSON API ──────────────────────────────────────────────────────────────
    @GetMapping("/api/health")
    @ResponseBody
    public ResponseEntity<DashboardSummary> healthApi() {
        return ResponseEntity.ok(healthCheckService.buildSummary());
    }

    @GetMapping("/api/health/{serviceName}")
    @ResponseBody
    public ResponseEntity<?> serviceDetail(@PathVariable String serviceName) {
        DashboardSummary summary = healthCheckService.buildSummary();
        Optional<ServiceHealth> svc = summary.getServices().stream()
                .filter(s -> s.getName().equalsIgnoreCase(serviceName))
                .findFirst();
        return svc.<ResponseEntity<?>>map(ResponseEntity::ok)
                  .orElse(ResponseEntity.notFound().build());
    }
}
