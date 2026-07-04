package in.aviqr.registry.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class GlobalErrorController implements ErrorController {

    /**
     * Catch the Spring /error fallback — replaces the Whitelabel page for
     * browser traffic by redirecting to our health dashboard at /health.
     *
     * Machine traffic under /eureka/** (Eureka's own client/server protocol —
     * heartbeats, registration, lease renewal) must NOT be redirected here:
     * the Eureka Java client specifically checks for a plain 404 on a
     * heartbeat PUT to trigger automatic re-registration. A redirect instead
     * of that 404 makes the underlying HTTP client throw "circular redirect"
     * and the instance never recovers (silently drops out of the registry
     * until the process is restarted) — see auth-service/support-service
     * heartbeat failures. So for /eureka/** paths we pass the real status
     * code straight through instead of redirecting.
     */
    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request, Model model) {
        Object uri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        if (uri != null && uri.toString().startsWith("/eureka")) {
            Object statusAttr = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
            HttpStatus status = statusAttr != null
                ? HttpStatus.valueOf((Integer) statusAttr)
                : HttpStatus.NOT_FOUND;
            return ResponseEntity.status(status).build();
        }
        // Browser-facing 404/500s: redirect to the dashboard
        return "redirect:/health";
    }

    /**
     * Direct GET on /eureka (without trailing slash) — redirect to dashboard.
     * With trailing slash, Eureka's own servlet handles it and returns XML/JSON;
     * that's fine and expected.
     */
    @GetMapping("/eureka")
    public String eurekaRoot() {
        return "redirect:/health";
    }

    /**
     * Eureka status page redirect — people sometimes type this URL.
     */
    @GetMapping("/eureka/status")
    public String eurekaStatus() {
        return "redirect:/health";
    }

    /**
     * Eureka info endpoint — redirect to dashboard.
     */
    @GetMapping("/eureka/info")
    public String eurekaInfo() {
        return "redirect:/health";
    }
}
