package in.aviqr.support.dto;
import lombok.Data;
import java.util.List;

// Bulk import — the client (admin UI) parses the CSV and posts rows as JSON,
// so this service doesn't need a CSV-parsing dependency or multipart handling.
@Data
public class LeadImportRequest {
    private List<LeadRequest> leads;
}
