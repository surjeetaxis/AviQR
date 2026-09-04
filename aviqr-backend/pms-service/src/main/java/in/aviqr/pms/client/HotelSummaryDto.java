package in.aviqr.pms.client;

import lombok.Data;
import java.util.UUID;

/** Mirrors the subset of hotel-service's Hotel fields pms-service needs for
 *  chain-wide reporting. */
@Data
public class HotelSummaryDto {
    private UUID id;
    private String name;
}
