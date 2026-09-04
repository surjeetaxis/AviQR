package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelInfoDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.config.RabbitMQConfig;
import in.aviqr.pms.dto.NightAuditReport;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Daily emailed night-audit PDF — a gap found comparing against the legacy CRS's
 * scheduled Jasper reports (AviQR's reports were in-app/JSON-only until this).
 * Publishes raw report data rather than a rendered PDF — notification-report-review-
 * service owns rendering/formatting for every other scheduled message in this
 * codebase (see OrderRoomChargeFolioConsumer's WhatsApp sends, PMS_BALANCE_DUE), so
 * this follows the same split rather than adding a PDF dependency here too.
 */
@Component @RequiredArgsConstructor @Slf4j
public class NightAuditEmailScheduler {

    private final HotelServiceClient hotelServiceClient;
    private final NightAuditService nightAuditService;
    private final RabbitTemplate rabbitTemplate;

    @Value("${pms.reportemail.job.enabled:true}")
    private boolean enabled;

    // Runs after the no-show/balance-due jobs (02:15/02:30) so this reflects the same
    // settled state — reports on the night that just ended, not the one in progress.
    @Scheduled(cron = "${pms.reportemail.job.cron:0 45 2 * * *}")
    public void emailNightAuditReports() {
        if (!enabled) return;
        LocalDate reportDate = LocalDate.now().minusDays(1);
        var hotels = hotelServiceClient.getAllActiveHotels();
        int sent = 0;
        for (HotelInfoDto hotel : hotels) {
            try {
                NightAuditReport report = nightAuditService.forDate(hotel.getId(), reportDate);
                Map<String, Object> event = new HashMap<>();
                event.put("hotelId", hotel.getId().toString());
                event.put("hotelEmail", hotel.getEmail());
                event.put("hotelName", hotel.getName());
                event.put("date", reportDate.toString());
                event.put("totalRooms", report.getTotalRooms());
                event.put("roomsSold", report.getRoomsSold());
                event.put("occupancyPercent", report.getOccupancyPercent().toString());
                event.put("roomRevenue", report.getRoomRevenue().toString());
                event.put("adr", report.getAdr().toString());
                event.put("revPar", report.getRevPar().toString());
                event.put("arrivals", report.getArrivals());
                event.put("departures", report.getDepartures());
                event.put("noShows", report.getNoShows());
                event.put("cancellations", report.getCancellations());
                rabbitTemplate.convertAndSend(RabbitMQConfig.HOTEL_EXCHANGE, "pms.report.ready", event);
                sent++;
            } catch (Exception e) {
                log.warn("Could not build/publish night-audit report for hotel {}: {}", hotel.getId(), e.getMessage());
            }
        }
        if (sent > 0) log.info("Published {} night-audit report event(s) for {}", sent, reportDate);
    }
}
