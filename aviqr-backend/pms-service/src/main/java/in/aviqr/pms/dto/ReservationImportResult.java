package in.aviqr.pms.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class ReservationImportResult {
    private int totalRows;
    private int succeeded;
    private int failed;
    private List<RowError> errors;

    @Data @Builder
    public static class RowError {
        private int rowNumber;
        private String message;
    }
}
