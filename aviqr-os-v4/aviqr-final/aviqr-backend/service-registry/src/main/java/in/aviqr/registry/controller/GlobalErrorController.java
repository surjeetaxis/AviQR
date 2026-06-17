package in.aviqr.registry.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class GlobalErrorController implements ErrorController {

    /**
     * Catch the Spring /error fallback — replaces the Whitelabel page.
     * Any unhandled 404/500 redirects to our health dashboard at /health.
     */
    @RequestMapping("/error")
    public String handleError(HttpServletRequest request, Model model) {
        // Just redirect everything to the dashboard
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
