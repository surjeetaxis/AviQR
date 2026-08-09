package in.aviqr.menu.service;

import in.aviqr.menu.entity.Category;
import in.aviqr.menu.entity.MenuItem;
import in.aviqr.menu.repository.CategoryRepository;
import in.aviqr.menu.repository.MenuItemRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * Bulk menu import from a spreadsheet — the CSV/Excel counterpart to the OCR photo-scan
 * flow. Expected columns (case-insensitive, any order): Category, Item Name, Description,
 * Price, Veg, Spicy, Popular. Only Category/Item Name/Price are required.
 */
@Service @RequiredArgsConstructor @Slf4j
public class MenuImportService {

    private static final List<String> HEADERS =
        List.of("Category", "Item Name", "Description", "Price", "Veg", "Spicy", "Popular");

    private final CategoryRepository catRepo;
    private final MenuItemRepository itemRepo;

    @Getter
    public static class RowError {
        private final int row;
        private final String message;
        public RowError(int row, String message) { this.row = row; this.message = message; }
    }

    @Getter
    public static class ImportResult {
        private int categoriesCreated;
        private int itemsCreated;
        private final List<RowError> errors = new ArrayList<>();
    }

    public ImportResult importFile(String shopId, MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        List<Map<String, String>> rows = filename.endsWith(".xlsx") || filename.endsWith(".xls")
            ? parseExcel(file.getInputStream())
            : parseCsv(file.getInputStream());

        ImportResult result = new ImportResult();
        Map<String, UUID> categoryIdByName = new HashMap<>();
        for (Category c : catRepo.findByShopIdAndActiveTrueOrderBySortOrder(shopId)) {
            categoryIdByName.put(c.getName().trim().toLowerCase(), c.getId());
        }
        int sortOrder = categoryIdByName.size();

        int rowNum = 1; // header is row 1, data starts at row 2
        for (Map<String, String> row : rows) {
            rowNum++;
            String categoryName = value(row, "category");
            String itemName     = value(row, "item name", "name");
            String priceRaw     = value(row, "price");

            if (isBlank(categoryName) || isBlank(itemName) || isBlank(priceRaw)) {
                result.errors.add(new RowError(rowNum, "Category, Item Name and Price are required"));
                continue;
            }
            BigDecimal price;
            try {
                price = new BigDecimal(priceRaw.replaceAll("[^0-9.]", ""));
            } catch (NumberFormatException e) {
                result.errors.add(new RowError(rowNum, "Invalid price: \"" + priceRaw + "\""));
                continue;
            }

            String catKey = categoryName.trim().toLowerCase();
            UUID categoryId = categoryIdByName.get(catKey);
            if (categoryId == null) {
                Category created = catRepo.save(Category.builder()
                    .shopId(shopId).name(categoryName.trim()).active(true).sortOrder(sortOrder++).build());
                categoryId = created.getId();
                categoryIdByName.put(catKey, categoryId);
                result.categoriesCreated++;
            }

            itemRepo.save(MenuItem.builder()
                .shopId(shopId)
                .categoryId(categoryId)
                .name(itemName.trim())
                .description(value(row, "description"))
                .price(price)
                .veg(toBool(value(row, "veg"), true))
                .spicy(toBool(value(row, "spicy"), false))
                .popular(toBool(value(row, "popular"), false))
                .available(true)
                .build());
            result.itemsCreated++;
        }
        return result;
    }

    // ── CSV ──────────────────────────────────────────────────────────────────────
    private List<Map<String, String>> parseCsv(InputStream in) throws IOException {
        List<Map<String, String>> rows = new ArrayList<>();
        List<String> lines = new String(in.readAllBytes(), StandardCharsets.UTF_8).lines().toList();
        if (lines.isEmpty()) return rows;

        List<String> headers = splitCsvLine(lines.get(0)).stream().map(h -> h.trim().toLowerCase()).toList();
        for (int i = 1; i < lines.size(); i++) {
            if (lines.get(i).isBlank()) continue;
            List<String> cells = splitCsvLine(lines.get(i));
            Map<String, String> row = new HashMap<>();
            for (int c = 0; c < headers.size() && c < cells.size(); c++) row.put(headers.get(c), cells.get(c));
            rows.add(row);
        }
        return rows;
    }

    // Minimal RFC-4180 splitter: handles quoted fields containing commas/escaped quotes,
    // which a plain String.split(",") would break on.
    private List<String> splitCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (inQuotes) {
                if (ch == '"' && i + 1 < line.length() && line.charAt(i + 1) == '"') { cur.append('"'); i++; }
                else if (ch == '"') inQuotes = false;
                else cur.append(ch);
            } else {
                if (ch == '"') inQuotes = true;
                else if (ch == ',') { out.add(cur.toString()); cur.setLength(0); }
                else cur.append(ch);
            }
        }
        out.add(cur.toString());
        return out;
    }

    // ── Excel ────────────────────────────────────────────────────────────────────
    private List<Map<String, String>> parseExcel(InputStream in) throws IOException {
        List<Map<String, String>> rows = new ArrayList<>();
        try (Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            DataFormatter fmt = new DataFormatter();
            Iterator<Row> it = sheet.rowIterator();
            if (!it.hasNext()) return rows;

            Row headerRow = it.next();
            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) headers.add(fmt.formatCellValue(cell).trim().toLowerCase());

            while (it.hasNext()) {
                Row r = it.next();
                Map<String, String> row = new HashMap<>();
                for (int c = 0; c < headers.size(); c++) {
                    Cell cell = r.getCell(c, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
                    row.put(headers.get(c), cell != null ? fmt.formatCellValue(cell).trim() : "");
                }
                if (row.values().stream().allMatch(String::isBlank)) continue;
                rows.add(row);
            }
        }
        return rows;
    }

    // ── Sample templates ──────────────────────────────────────────────────────────
    public byte[] sampleCsv() {
        String csv = "Category,Item Name,Description,Price,Veg,Spicy,Popular\n"
            + "Starters,Paneer Tikka,Grilled cottage cheese marinated in spices,280,Yes,No,Yes\n"
            + "Starters,Chicken 65,Deep-fried spicy chicken bites,260,No,Yes,No\n"
            + "Main Course,Dal Makhani,Slow-cooked black lentils in butter and cream,260,Yes,No,No\n"
            + "Beverages,Masala Chai,Spiced Indian tea,30,Yes,No,No\n";
        return csv.getBytes(StandardCharsets.UTF_8);
    }

    public byte[] sampleXlsx() throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Menu");
            CellStyle boldStyle = wb.createCellStyle();
            Font bold = wb.createFont();
            bold.setBold(true);
            boldStyle.setFont(bold);

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.size(); i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(HEADERS.get(i));
                cell.setCellStyle(boldStyle);
                sheet.setColumnWidth(i, 22 * 256);
            }

            Object[][] sample = {
                {"Starters", "Paneer Tikka", "Grilled cottage cheese marinated in spices", 280, "Yes", "No", "Yes"},
                {"Starters", "Chicken 65", "Deep-fried spicy chicken bites", 260, "No", "Yes", "No"},
                {"Main Course", "Dal Makhani", "Slow-cooked black lentils in butter and cream", 260, "Yes", "No", "No"},
                {"Beverages", "Masala Chai", "Spiced Indian tea", 30, "Yes", "No", "No"},
            };
            for (int r = 0; r < sample.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < sample[r].length; c++) {
                    Cell cell = row.createCell(c);
                    Object v = sample[r][c];
                    if (v instanceof Integer n) cell.setCellValue(n);
                    else cell.setCellValue(v.toString());
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────────
    private String value(Map<String, String> row, String... keys) {
        for (String k : keys) {
            String v = row.get(k);
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }

    private boolean isBlank(String s) { return s == null || s.isBlank(); }

    private boolean toBool(String s, boolean fallback) {
        if (isBlank(s)) return fallback;
        String v = s.trim().toLowerCase();
        return v.equals("yes") || v.equals("y") || v.equals("true") || v.equals("1");
    }
}
