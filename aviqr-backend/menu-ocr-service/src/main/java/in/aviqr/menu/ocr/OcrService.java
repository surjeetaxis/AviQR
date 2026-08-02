package in.aviqr.menu.ocr;



import in.aviqr.menu.entity.Category;
import in.aviqr.menu.entity.MenuItem;
import in.aviqr.menu.repository.CategoryRepository;
import in.aviqr.menu.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.AnnotateImageResponse;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.Block;
import com.google.cloud.vision.v1.BoundingPoly;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.Page;
import com.google.cloud.vision.v1.Paragraph;
import com.google.cloud.vision.v1.Symbol;
import com.google.cloud.vision.v1.TextAnnotation;
import com.google.cloud.vision.v1.Vertex;
import com.google.cloud.vision.v1.Word;
import com.google.protobuf.ByteString;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.*;
import java.util.stream.Collectors;

/**
 * OCR Service — extracts menu items from uploaded images using Google Cloud Vision API.
 *
 * When GOOGLE_APPLICATION_CREDENTIALS is set → real Vision API call via service-account auth (TEXT_DETECTION).
 * Else when GOOGLE_VISION_API_KEY is set → real Vision API call via API-key REST auth (TEXT_DETECTION).
 * When neither is set → intelligent mock (simulates processing delay + returns demo items).
 *
 * ADD to ocr-service/build.gradle:
 *   implementation 'com.fasterxml.jackson.core:jackson-databind'
 *
 * OCR FLOW:
 *   1. Owner uploads menu photo
 *   2. Image → Vision API → raw text
 *   3. Text parsed into {category, name, price} items
 *   4. Owner reviews and approves
 *   5. Approved items published to RabbitMQ → menu-service creates them
 */
@Service @RequiredArgsConstructor @Slf4j
public class OcrService {

    private final OcrJobRepository    repo;
    private final RabbitTemplate      rabbit;
    private final CategoryRepository  categoryRepo;
    private final MenuItemRepository  itemRepo;
    private final ObjectMapper        mapper = new ObjectMapper();

    @Value("${google.vision.api.key:}") private String visionApiKey;

    // Set by the standard GOOGLE_APPLICATION_CREDENTIALS env var (path to a GCP service-account
    // JSON key) — when present, ImageAnnotatorClient.create() picks it up via Application Default
    // Credentials automatically. Preferred over the legacy API-key REST path below since Vision API
    // keys are increasingly restricted; a service account is the standard server-side auth mechanism.
    @Value("${GOOGLE_APPLICATION_CREDENTIALS:}") private String gcpCredentialsPath;

    public OcrJob startJob(String shopId, String userId, MultipartFile file) {
        String fileType = file.getContentType() != null
            && file.getContentType().contains("pdf") ? "PDF" : "IMAGE";

        OcrJob job = OcrJob.builder()
            .shopId(shopId)
            .fileUrl("pending_upload")
            .fileType(fileType)
            .status("PROCESSING")
            .createdAt(LocalDateTime.now())
            .build();
        job = repo.save(job);
        final String jobId = job.getId();

        // Process asynchronously
        final byte[] imageBytes;
        try { imageBytes = file.getBytes(); } catch (Exception e) {
            log.error("Failed to read uploaded file: {}", e.getMessage());
            markFailed(jobId);
            return job;
        }

        CompletableFuture.runAsync(() -> processImage(jobId, imageBytes));
        return job;
    }

    private void processImage(String jobId, byte[] imageBytes) {
        try {
            List<OcrJob.ExtractedItem> items;
            if (gcpCredentialsPath != null && !gcpCredentialsPath.isBlank()) {
                items = callGoogleVisionSdk(imageBytes);
                log.info("OCR job {} — Vision API (service account) returned {} items", jobId, items.size());
            } else if (visionApiKey != null && !visionApiKey.isBlank()) {
                items = callGoogleVision(imageBytes);
                log.info("OCR job {} — Vision API returned {} items", jobId, items.size());
            } else {
                // Intelligent mock with realistic delay
                Thread.sleep(2500);
                items = getMockItems();
                log.info("OCR job {} — using mock (set GOOGLE_VISION_API_KEY for real Vision API)", jobId);
            }

            repo.findById(jobId).ifPresent(j -> {
                j.setStatus("COMPLETED");
                j.setExtractedItems(items);
                j.setCompletedAt(LocalDateTime.now());
                repo.save(j);
            });
        } catch (Exception e) {
            log.error("OCR processing failed for job {}: {}", jobId, e.getMessage(), e);
            markFailed(jobId);
        }
    }

    /** Real Google Cloud Vision API call — TEXT_DETECTION feature */
    private List<OcrJob.ExtractedItem> callGoogleVision(byte[] imageBytes) throws Exception {
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String requestBody = """
            {"requests":[{"image":{"content":"%s"},"features":[{"type":"TEXT_DETECTION","maxResults":1}]}]}
            """.formatted(base64);

        RestTemplate rt = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String url = "https://vision.googleapis.com/v1/images:annotate?key=" + visionApiKey;
        ResponseEntity<String> response = rt.exchange(url, HttpMethod.POST,
            new HttpEntity<>(requestBody, headers), String.class);

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Vision API returned: " + response.getStatusCode());
        }

        JsonNode root = mapper.readTree(response.getBody());
        String text = root.path("responses").path(0)
            .path("fullTextAnnotation").path("text").asText("");

        return parseMenuText(text);
    }

    /** Real Google Cloud Vision API call authenticated via a service-account key
     *  (GOOGLE_APPLICATION_CREDENTIALS) instead of an API key. Uses DOCUMENT_TEXT_DETECTION
     *  (Google's recommended feature for dense multi-column documents like menus, vs. the
     *  sparse-text-oriented TEXT_DETECTION) and parses via word bounding-box geometry rather
     *  than the flat text string — see parseMenuTextSpatial for why that matters. */
    private List<OcrJob.ExtractedItem> callGoogleVisionSdk(byte[] imageBytes) throws Exception {
        try (ImageAnnotatorClient client = ImageAnnotatorClient.create()) {
            Image img = Image.newBuilder().setContent(ByteString.copyFrom(imageBytes)).build();
            Feature feat = Feature.newBuilder().setType(Feature.Type.DOCUMENT_TEXT_DETECTION).build();
            AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                .addFeatures(feat).setImage(img).build();

            BatchAnnotateImagesResponse batchResponse = client.batchAnnotateImages(List.of(request));
            AnnotateImageResponse res = batchResponse.getResponsesList().get(0);
            if (res.hasError()) {
                throw new RuntimeException("Vision API error: " + res.getError().getMessage());
            }
            List<OcrJob.ExtractedItem> items = parseMenuTextSpatial(res.getFullTextAnnotation());
            return items.isEmpty() ? parseMenuText(res.getFullTextAnnotation().getText()) : items;
        }
    }

    /**
     * Parses raw OCR text into structured menu items.
     * Looks for price patterns like "₹280", "Rs.280", "280/-" and extracts
     * item names on the same or adjacent line.
     */
    List<OcrJob.ExtractedItem> parseMenuText(String text) {
        List<OcrJob.ExtractedItem> items = new ArrayList<>();
        if (text == null || text.isBlank()) return items;

        String[] lines = text.split("\n");
        Pattern pricePattern = Pattern.compile("(?:₹|Rs\\.?|INR)?\\s*(\\d{2,4})(?:/)?");
        String currentCategory = "Uncategorised";

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isBlank()) continue;

            // Detect category headers (all-caps short lines with no price)
            Matcher pm = pricePattern.matcher(line);
            boolean hasPrice = pm.find();

            if (!hasPrice && isCategoryHeader(line)) {
                currentCategory = capitalize(line);
                continue;
            }

            if (hasPrice) {
                String priceStr = pm.group(1);
                String itemName = line.substring(0, pm.start()).replaceAll("[.·•\\-]+$", "").trim();
                if (itemName.length() >= 3) {
                    // Check next line for description
                    String desc = (i + 1 < lines.length && !pricePattern.matcher(lines[i+1]).find())
                        ? lines[i+1].trim() : "";
                    double confidence = itemName.length() > 5 ? 0.92 : 0.78;
                    items.add(new OcrJob.ExtractedItem(currentCategory, itemName, priceStr, desc, confidence));
                }
            }
        }
        return items.isEmpty() ? getMockItems() : items; // fallback if parsing yields nothing
    }

    /**
     * Parses a DOCUMENT_TEXT_DETECTION result using word-level bounding-box geometry instead
     * of the flat text string parseMenuText(String) works from. On a multi-column menu (item
     * name in one column, price right-aligned in another), Vision's own linear reading order
     * frequently interleaves unrelated rows — e.g. two items' names print back-to-back with
     * both prices only showing up several "lines" later in the flat text, so a price ends up
     * paired with the wrong neighbouring name. Reconstructing actual visual rows from word
     * Y-coordinates and reading each row left-to-right fixes that mispairing at the source.
     */
    private List<OcrJob.ExtractedItem> parseMenuTextSpatial(TextAnnotation annotation) {
        List<WordBox> words = new ArrayList<>();
        for (Page page : annotation.getPagesList()) {
            for (Block block : page.getBlocksList()) {
                for (Paragraph para : block.getParagraphsList()) {
                    for (Word word : para.getWordsList()) {
                        StringBuilder text = new StringBuilder();
                        for (Symbol sym : word.getSymbolsList()) text.append(sym.getText());
                        if (!text.isEmpty()) words.add(new WordBox(text.toString(), word.getBoundingBox()));
                    }
                }
            }
        }
        if (words.isEmpty()) return List.of();

        // Row height varies with font size across a menu, so derive the row-clustering
        // tolerance from the actual words instead of a fixed pixel threshold.
        List<Double> heights = words.stream().map(w -> w.maxY() - w.minY()).sorted().toList();
        double medianHeight = heights.get(heights.size() / 2);
        double rowTolerance = Math.max(medianHeight * 0.6, 8);

        // Anchored to each row's FIRST (topmost) word rather than a running average of
        // its members — a drifting average lets a long chain of only-slightly-different
        // Y-coordinates merge many real rows into one (classic single-linkage "chaining"),
        // which is what happened here on first pass: whole columns collapsed into one row.
        words.sort(Comparator.comparingDouble(WordBox::centerY));
        List<List<WordBox>> rows = new ArrayList<>();
        List<WordBox> currentRow = new ArrayList<>();
        double rowAnchorY = -1;
        for (WordBox w : words) {
            if (currentRow.isEmpty() || Math.abs(w.centerY() - rowAnchorY) <= rowTolerance) {
                if (currentRow.isEmpty()) rowAnchorY = w.centerY();
                currentRow.add(w);
            } else {
                rows.add(currentRow);
                currentRow = new ArrayList<>(List.of(w));
                rowAnchorY = w.centerY();
            }
        }
        if (!currentRow.isEmpty()) rows.add(currentRow);

        Pattern pricePattern = Pattern.compile("(?:₹|Rs\\.?|INR)?\\s*(\\d{2,4})(?:/)?");
        List<OcrJob.ExtractedItem> items = new ArrayList<>();
        String currentCategory = "Uncategorised";
        String pendingItemName = null; // text-only row waiting for a price-only row right below it

        for (List<WordBox> row : rows) {
            row.sort(Comparator.comparingDouble(WordBox::minX));
            String rowText = row.stream().map(WordBox::text).collect(Collectors.joining(" ")).trim();
            if (rowText.isBlank()) continue;

            // A single visual row often holds MULTIPLE items when it spans several menu
            // columns at the same height (e.g. "Corn Sandwich 100 Chicken Tikka Wrap 120")
            // — collect every price in the row rather than only the first, and pair each
            // with the name text immediately before it, so the row splits into as many
            // items as it actually contains instead of merging them into one. (Matcher is
            // mutable/stateful, so each match's start/end/value is captured immediately —
            // storing the Matcher itself would leave every entry pointing at the last match.)
            Matcher pm = pricePattern.matcher(rowText);
            List<int[]> priceSpans = new ArrayList<>();
            List<String> priceValues = new ArrayList<>();
            while (pm.find()) {
                priceSpans.add(new int[]{pm.start(), pm.end()});
                priceValues.add(pm.group(1));
            }
            boolean hasPrice = !priceSpans.isEmpty();

            if (!hasPrice && isCategoryHeader(rowText)) {
                // A header row spanning several widely-separated columns (e.g. 4 section
                // titles side-by-side at the same height) can't be resolved to one category
                // name — skip rather than record a garbled concatenation of all of them,
                // keeping whatever category was already active.
                if (!spansMultipleColumns(row)) currentCategory = capitalize(rowText);
                pendingItemName = null;
                continue;
            }

            if (hasPrice) {
                int segmentStart = 0;
                for (int i = 0; i < priceSpans.size(); i++) {
                    int[] span = priceSpans.get(i);
                    String segment = rowText.substring(segmentStart, span[0]);
                    String itemName = segment.replaceAll("[.·•|!\\-]+", " ").trim();
                    if (itemName.isBlank()) itemName = pendingItemName;
                    if (itemName != null && itemName.length() >= 3) {
                        double confidence = row.size() > 1 ? 0.9 : 0.75;
                        items.add(new OcrJob.ExtractedItem(currentCategory, itemName, priceValues.get(i), "", confidence));
                    }
                    pendingItemName = null;
                    segmentStart = span[1];
                }
            } else {
                // Text-only row with no price of its own — remember it in case the row
                // immediately below turns out to be a lone, otherwise-unpaired price.
                pendingItemName = rowText.length() >= 3 ? rowText : null;
            }
        }
        return items;
    }

    // Taglines ("FUEL YOUR GAME!", "GOOD FOOD. GREAT MOOD. GAME ON!") are also short and
    // all-caps but are full sentences with terminal/sentence punctuation — real category
    // headers in practice are bare label phrases ("SNACKS", "ROLLS & WRAPS").
    private boolean isCategoryHeader(String line) {
        return line.length() > 3 && line.length() < 30
            && line.equals(line.toUpperCase())
            && !line.matches(".*[.!=].*");
    }

    // A big horizontal gap between consecutive words (many times the average word width)
    // means the row-clustering merged two visually separate column headers rather than
    // one multi-word header phrase.
    private boolean spansMultipleColumns(List<WordBox> row) {
        if (row.size() < 2) return false;
        double avgWordWidth = row.stream().mapToDouble(w -> w.maxX() - w.minX()).average().orElse(1);
        for (int i = 1; i < row.size(); i++) {
            if (row.get(i).minX() - row.get(i - 1).maxX() > avgWordWidth * 4) return true;
        }
        return false;
    }

    private record WordBox(String text, double minX, double maxX, double minY, double maxY) {
        WordBox(String text, BoundingPoly box) {
            this(text,
                box.getVerticesList().stream().mapToDouble(Vertex::getX).min().orElse(0),
                box.getVerticesList().stream().mapToDouble(Vertex::getX).max().orElse(0),
                box.getVerticesList().stream().mapToDouble(Vertex::getY).min().orElse(0),
                box.getVerticesList().stream().mapToDouble(Vertex::getY).max().orElse(0));
        }
        double centerY() { return (minY + maxY) / 2; }
    }

    private String capitalize(String s) {
        if (s.isBlank()) return s;
        return s.charAt(0) + s.substring(1).toLowerCase();
    }

    public void approveJob(String jobId, List<OcrJob.ExtractedItem> editedItems) {
        repo.findById(jobId).ifPresent(j -> {
            j.setOwnerApproved(true);
            if (editedItems != null && !editedItems.isEmpty()) j.setExtractedItems(editedItems);
            repo.save(j);
            if ("COMPLETED".equals(j.getStatus()) && j.getExtractedItems() != null) {
                createMenuItemsFromJob(j);
            }
            try {
                rabbit.convertAndSend("aviqr.ocr", "menu.items.approved",
                    Map.of("jobId", jobId, "shopId", j.getShopId(),
                           "items", j.getExtractedItems() != null ? j.getExtractedItems() : List.of()));
                log.info("OCR job {} approved — items published to menu-service", jobId);
            } catch (Exception e) { log.warn("Failed to publish OCR approval: {}", e.getMessage()); }
        });
    }

    /** Creates real Category/MenuItem rows from an approved OCR job's extracted items. */
    private void createMenuItemsFromJob(OcrJob job) {
        String shopId = job.getShopId();
        Map<String, UUID> categoryIdByName = new HashMap<>();
        for (Category c : categoryRepo.findByShopIdAndActiveTrueOrderBySortOrder(shopId)) {
            categoryIdByName.put(c.getName().toLowerCase(), c.getId());
        }

        for (OcrJob.ExtractedItem extracted : job.getExtractedItems()) {
            String categoryName = extracted.getCategory() != null && !extracted.getCategory().isBlank()
                ? extracted.getCategory() : "Uncategorised";
            UUID categoryId = categoryIdByName.computeIfAbsent(categoryName.toLowerCase(), key -> {
                Category created = categoryRepo.save(Category.builder()
                    .shopId(shopId).name(categoryName).active(true).build());
                return created.getId();
            });

            itemRepo.save(MenuItem.builder()
                .name(extracted.getName())
                .description(extracted.getDescription())
                .shopId(shopId)
                .categoryId(categoryId)
                .price(parsePrice(extracted.getPrice()))
                .veg(extracted.getVeg() == null || extracted.getVeg())
                .spicy(Boolean.TRUE.equals(extracted.getSpicy()))
                .popular(Boolean.TRUE.equals(extracted.getPopular()))
                .imageUrl(extracted.getImageUrl())
                .videoUrl(extracted.getVideoUrl())
                .modelUrl(extracted.getModelUrl())
                .mediaType(extracted.getMediaType() != null ? extracted.getMediaType() : "NONE")
                .nameHi(extracted.getNameHi())
                .nameTa(extracted.getNameTa())
                .nameTe(extracted.getNameTe())
                .available(true)
                .build());
        }
        log.info("OCR job {} approved — created {} menu items for shop {}",
            job.getId(), job.getExtractedItems().size(), shopId);
    }

    private BigDecimal parsePrice(String raw) {
        if (raw == null) return BigDecimal.ZERO;
        String cleaned = raw.replaceAll("[^0-9.]", "");
        if (cleaned.isBlank()) return BigDecimal.ZERO;
        try { return new BigDecimal(cleaned); } catch (NumberFormatException e) { return BigDecimal.ZERO; }
    }

    private void markFailed(String jobId) {
        repo.findById(jobId).ifPresent(j -> {
            j.setStatus("FAILED");
            j.setCompletedAt(LocalDateTime.now());
            repo.save(j);
        });
    }

    private List<OcrJob.ExtractedItem> getMockItems() {
        return List.of(
            new OcrJob.ExtractedItem("Starters",  "Paneer Tikka",         "280", "Grilled cottage cheese",    0.94),
            new OcrJob.ExtractedItem("Starters",  "Samosa (2 pcs)",        "60",  "Potato filled pastry",     0.91),
            new OcrJob.ExtractedItem("Starters",  "Soup of the Day",       "80",  "Ask server for today's soup",0.85),
            new OcrJob.ExtractedItem("Mains",     "Paneer Butter Masala", "320", "Rich tomato gravy with paneer",0.96),
            new OcrJob.ExtractedItem("Mains",     "Dal Makhani",          "260", "Slow-cooked black lentils", 0.93),
            new OcrJob.ExtractedItem("Mains",     "Chicken Tikka Masala", "380", "Tender chicken in spiced gravy",0.95),
            new OcrJob.ExtractedItem("Breads",    "Butter Naan",           "40",  "Soft leavened bread",       0.97),
            new OcrJob.ExtractedItem("Breads",    "Paratha",               "35",  "Whole wheat layered bread",  0.95),
            new OcrJob.ExtractedItem("Beverages", "Masala Chai",           "30",  "Spiced tea",                0.89),
            new OcrJob.ExtractedItem("Beverages", "Fresh Lime Soda",       "60",  "Sweet or salted",           0.92)
        );
    }
}
