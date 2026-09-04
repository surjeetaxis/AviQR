package in.aviqr.pms.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ChainPushResult {
    private int hotelsProcessed;
    private int roomTypesCreated;
    private int roomTypesUpdated;
    private int ratePlansCreated;
    private int ratePlansUpdated;
}
