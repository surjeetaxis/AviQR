package in.aviqr.pms.service;

import in.aviqr.pms.repository.ChannelMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodic ARI push across every hotel with an active channel mapping — see
 *  settlement.job in payment-service for the same enabled-flag + cron-property pattern. */
@Component @RequiredArgsConstructor @Slf4j
public class ChannelSyncScheduler {

    private final ChannelMappingRepository mappingRepo;
    private final ChannelService channelService;

    @Value("${channel.sync.job.enabled:true}")
    private boolean enabled;

    @Scheduled(cron = "${channel.sync.cron:0 0 */6 * * *}")
    public void pushAll() {
        if (!enabled) return;
        mappingRepo.findDistinctHotelIdsWithActiveMapping().forEach(hotelId -> {
            try {
                channelService.pushAvailabilityAndRates(hotelId);
            } catch (Exception e) {
                log.warn("Scheduled ARI push failed for hotel {}: {}", hotelId, e.getMessage());
            }
        });
    }
}
