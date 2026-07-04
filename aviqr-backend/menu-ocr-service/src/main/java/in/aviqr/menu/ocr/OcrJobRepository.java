package in.aviqr.menu.ocr;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
public interface OcrJobRepository extends MongoRepository<OcrJob, String> {
    List<OcrJob> findByShopIdOrderByCreatedAtDesc(String shopId);
}