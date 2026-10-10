package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelInfoDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.client.NotificationClient;
import in.aviqr.pms.entity.GroupEnquiry;
import in.aviqr.pms.entity.ReservationGroup;
import in.aviqr.pms.repository.GroupEnquiryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;

/** Group quote requests from the booking engine. */
@Service @RequiredArgsConstructor @Slf4j
public class GroupEnquiryService {
    static final Set<String> EVENT_TYPES = Set.of("WEDDING", "CORPORATE", "CONFERENCE", "TOUR", "SPORTS", "OTHER");

    private final GroupEnquiryRepository enquiryRepo;
    private final GroupService groupService;
    private final HotelServiceClient hotelServiceClient;
    private final NotificationClient notifications;

    public GroupEnquiry submit(UUID hotelId, GroupEnquiry req) {
        String name = clean(req.getOrganizerName(), 120), phone = clean(req.getOrganizerPhone(), 32);
        if (name == null || phone == null || !phone.matches("[+0-9() .-]{7,32}")) throw new IllegalArgumentException("Your name and a phone number are required");
        String email = clean(req.getOrganizerEmail(), 254);
        if (email != null && !email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) throw new IllegalArgumentException("That email address doesn't look right");
        LocalDate in = req.getCheckInDate(), out = req.getCheckOutDate();
        if (in == null || out == null || !out.isAfter(in) || in.isBefore(LocalDate.now()) || ChronoUnit.DAYS.between(in, out) > 60)
            throw new IllegalArgumentException("Choose check-in and check-out dates (up to 60 nights)");
        if (req.getRooms() == null || req.getRooms() < 1 || req.getRooms() > 500) throw new IllegalArgumentException("Rooms must be between 1 and 500");
        if (req.getGuests() != null && (req.getGuests() < 1 || req.getGuests() > 2000)) throw new IllegalArgumentException("Guests must be between 1 and 2000");
        String event = req.getEventType() == null ? "OTHER" : req.getEventType().toUpperCase(Locale.ROOT);
        GroupEnquiry saved = enquiryRepo.save(GroupEnquiry.builder().hotelId(hotelId).organizerName(name).organizerPhone(phone)
            .organizerEmail(email).company(clean(req.getCompany(), 120)).eventType(EVENT_TYPES.contains(event) ? event : "OTHER")
            .checkInDate(in).checkOutDate(out).rooms(req.getRooms()).guests(req.getGuests()).message(clean(req.getMessage(), 1000)).status("NEW").build());
        // Emails never fail an enquiry.
        CompletableFuture.runAsync(() -> notify(saved));
        return saved;
    }

    public List<GroupEnquiry> list(UUID hotelId) { return enquiryRepo.findByHotelIdOrderByCreatedAtDesc(hotelId); }

    public GroupEnquiry update(GroupEnquiry enquiry, String status, String staffNotes) {
        if (status != null) {
            if (!GroupEnquiry.STATUSES.contains(status)) throw new IllegalArgumentException("Unknown status");
            enquiry.setStatus(status);
        }
        if (staffNotes != null) enquiry.setStaffNotes(clean(staffNotes, 500));
        return enquiryRepo.save(enquiry);
    }

    /** Makes the reservation group for a won enquiry, once. */
    @Transactional
    public GroupEnquiry convert(GroupEnquiry enquiry, String staffId) {
        if (enquiry.getGroupId() != null) return enquiry;
        String name = (enquiry.getCompany() != null ? enquiry.getCompany() : enquiry.getOrganizerName()) + " · "
            + enquiry.getEventType().charAt(0) + enquiry.getEventType().substring(1).toLowerCase(Locale.ROOT);
        ReservationGroup group = groupService.create(ReservationGroup.builder().hotelId(enquiry.getHotelId()).name(name)
            .organizerName(enquiry.getOrganizerName()).organizerPhone(enquiry.getOrganizerPhone()).organizerEmail(enquiry.getOrganizerEmail())
            .checkInDate(enquiry.getCheckInDate()).checkOutDate(enquiry.getCheckOutDate())
            .notes(clean("Online group enquiry: " + enquiry.getRooms() + " rooms"
                + (enquiry.getMessage() != null ? ". " + enquiry.getMessage() : ""), 255))
            .build(), staffId);
        enquiry.setGroupId(group.getId());
        enquiry.setStatus("WON");
        return enquiryRepo.save(enquiry);
    }

    private void notify(GroupEnquiry e) {
        try {
            HotelInfoDto hotel = hotelServiceClient.getAllActiveHotels().stream().filter(h -> e.getHotelId().equals(h.getId())).findFirst().orElse(null);
            String hotelName = hotel == null || hotel.getName() == null ? "the hotel" : hotel.getName();
            String summary = "<table cellpadding=\"4\">" + row("Organiser", e.getOrganizerName()) + row("Phone", e.getOrganizerPhone())
                + row("Email", e.getOrganizerEmail()) + row("Company", e.getCompany()) + row("Event", e.getEventType())
                + row("Dates", e.getCheckInDate() + " to " + e.getCheckOutDate()) + row("Rooms", String.valueOf(e.getRooms()))
                + row("Guests", e.getGuests() == null ? null : String.valueOf(e.getGuests())) + row("Message", e.getMessage()) + "</table>";
            if (hotel != null && hotel.getEmail() != null && !hotel.getEmail().isBlank())
                notifications.sendEmail(hotel.getEmail(), "New group enquiry: " + e.getRooms() + " rooms, " + e.getCheckInDate(),
                    "<p>A group enquiry came in from your booking page. Reply within a day to win it; it's in AviQR PMS under Groups.</p>" + summary);
            if (e.getOrganizerEmail() != null)
                notifications.sendEmail(e.getOrganizerEmail(), "We've received your group enquiry at " + hotelName,
                    "<p>Thank you, " + HtmlUtils.htmlEscape(e.getOrganizerName()) + ". " + HtmlUtils.htmlEscape(hotelName)
                        + " will send you a quote shortly.</p>" + summary);
        } catch (Exception ex) {
            log.warn("Group enquiry {} emails failed: {}", e.getId(), ex.getMessage());
        }
    }

    private static String row(String label, String value) {
        return value == null || value.isBlank() ? "" : "<tr><td><b>" + label + "</b></td><td>" + HtmlUtils.htmlEscape(value) + "</td></tr>";
    }

    private static String clean(String s, int max) {
        if (s == null) return null;
        String v = s.strip();
        return v.isEmpty() ? null : v.substring(0, Math.min(v.length(), max));
    }
}
