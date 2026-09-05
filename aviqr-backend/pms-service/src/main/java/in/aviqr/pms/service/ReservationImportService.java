package in.aviqr.pms.service;

import in.aviqr.pms.dto.ReservationImportResult;
import in.aviqr.pms.entity.Reservation;
import in.aviqr.pms.entity.ReservationSource;
import in.aviqr.pms.entity.ReservationStatus;
import in.aviqr.pms.entity.RoomType;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.repository.RoomTypeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Bulk CSV import for a hotel's historical reservations — a gap found comparing
 * against the legacy CRS's crs-service-import-data module. Onboarding tool only:
 * every row goes through the same room-assignment path a real booking uses
 * (ReservationService.createFromChannel), so imported stays still hold real
 * inventory and show up correctly in occupancy/revenue reports — this isn't a
 * separate, parallel data path.
 *
 * Expected CSV header (case-insensitive, comma-separated, no embedded commas in
 * any field — a v1 limitation, not a general CSV parser):
 *   guestName,guestPhone,checkInDate,checkOutDate,roomTypeName,ratePlanName,adults,children,status,notes
 * status is optional (defaults to BOOKED); ratePlanName/adults/children/notes are optional.
 */
@Service @RequiredArgsConstructor @Slf4j
public class ReservationImportService {

    private static final List<String> EXPECTED_HEADER = List.of(
        "guestname", "guestphone", "checkindate", "checkoutdate", "roomtypename",
        "rateplanname", "adults", "children", "status", "notes");

    private final ReservationService reservationService;
    private final ReservationRepository reservationRepo;
    private final RoomTypeRepository roomTypeRepo;

    public ReservationImportResult importCsv(UUID hotelId, MultipartFile file) {
        List<ReservationImportResult.RowError> errors = new ArrayList<>();
        int total = 0, succeeded = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return ReservationImportResult.builder().totalRows(0).succeeded(0).failed(0).errors(List.of()).build();
            }
            List<String> header = splitLower(headerLine);
            if (!header.containsAll(EXPECTED_HEADER)) {
                errors.add(ReservationImportResult.RowError.builder().rowNumber(1)
                    .message("Header must include: " + String.join(",", EXPECTED_HEADER)).build());
                return ReservationImportResult.builder().totalRows(0).succeeded(0).failed(1).errors(errors).build();
            }

            String line;
            int rowNumber = 1;
            while ((line = reader.readLine()) != null) {
                rowNumber++;
                if (line.isBlank()) continue;
                total++;
                try {
                    importRow(hotelId, header, splitRaw(line));
                    succeeded++;
                } catch (Exception e) {
                    errors.add(ReservationImportResult.RowError.builder().rowNumber(rowNumber).message(e.getMessage()).build());
                }
            }
        } catch (IOException e) {
            log.error("Could not read import CSV", e);
            errors.add(ReservationImportResult.RowError.builder().rowNumber(0).message("Could not read file: " + e.getMessage()).build());
        }

        return ReservationImportResult.builder()
            .totalRows(total).succeeded(succeeded).failed(errors.size())
            .errors(errors)
            .build();
    }

    private void importRow(UUID hotelId, List<String> header, List<String> values) {
        String guestName = col(header, values, "guestname");
        String guestPhone = col(header, values, "guestphone");
        LocalDate checkIn = LocalDate.parse(col(header, values, "checkindate"));
        LocalDate checkOut = LocalDate.parse(col(header, values, "checkoutdate"));
        String roomTypeName = col(header, values, "roomtypename");
        int adults = parseIntOr(col(header, values, "adults"), 1);
        int children = parseIntOr(col(header, values, "children"), 0);
        String statusStr = col(header, values, "status");
        String notes = col(header, values, "notes");

        if (guestName == null || guestName.isBlank()) throw new RuntimeException("guestName is required");
        RoomType roomType = roomTypeRepo.findByHotelIdAndName(hotelId, roomTypeName)
            .orElseThrow(() -> new RuntimeException("No room type named '" + roomTypeName + "' for this hotel"));

        Reservation reservation = reservationService.createFromChannel(
            hotelId, guestName, guestPhone, checkIn, checkOut, adults, children,
            (notes == null || notes.isBlank()) ? "Imported from CSV" : notes,
            List.of(new ReservationService.ChannelRoomLine(roomType.getId(), BigDecimal.ZERO)));

        reservation.setSource(ReservationSource.IMPORTED);
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                reservation.setStatus(ReservationStatus.valueOf(statusStr.trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new RuntimeException("Unknown status '" + statusStr + "' — expected one of BOOKED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW");
            }
        }
        reservationRepo.save(reservation);
    }

    private List<String> splitLower(String line) {
        List<String> out = new ArrayList<>();
        for (String s : line.split(",", -1)) out.add(s.trim().toLowerCase());
        return out;
    }

    private List<String> splitRaw(String line) {
        List<String> out = new ArrayList<>();
        for (String s : line.split(",", -1)) out.add(s.trim());
        return out;
    }

    private String col(List<String> header, List<String> values, String name) {
        int idx = header.indexOf(name);
        if (idx < 0 || idx >= values.size()) return null;
        String v = values.get(idx);
        return (v == null || v.isBlank()) ? null : v;
    }

    private int parseIntOr(String s, int fallback) {
        try { return s == null ? fallback : Integer.parseInt(s.trim()); }
        catch (NumberFormatException e) { return fallback; }
    }
}
