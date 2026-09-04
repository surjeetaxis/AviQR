package in.aviqr.pms.service;

import in.aviqr.pms.client.HotelRoomDto;
import in.aviqr.pms.client.HotelServiceClient;
import in.aviqr.pms.dto.CreateReservationRequest;
import in.aviqr.pms.entity.*;
import in.aviqr.pms.repository.ReservationRepository;
import in.aviqr.pms.repository.RoomReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepo;
    private final RoomReservationRepository roomReservationRepo;
    private final AvailabilityService availabilityService;
    private final RatePlanService ratePlanService;
    private final FolioService folioService;
    private final HotelServiceClient hotelServiceClient;
    private final CommissionService commissionService;
    private final GuestService guestService;
    private final SurchargeService surchargeService;
    private final InvoiceService invoiceService;
    private final RegistrationCardService registrationCardService;
    private final LoyaltyService loyaltyService;

    @Transactional
    public Reservation create(CreateReservationRequest req, String createdBy) {
        if (req.getRooms() == null || req.getRooms().isEmpty())
            throw new RuntimeException("At least one room must be requested");
        if (!req.getCheckInDate().isBefore(req.getCheckOutDate()))
            throw new RuntimeException("checkOutDate must be after checkInDate");

        ReservationSource source = req.getSource() != null ? req.getSource()
            : req.getAgentId() != null ? ReservationSource.AGENT : ReservationSource.DIRECT;

        // Every booking with a phone number ends up linked to a Guest record — either
        // the one the caller already picked, or a match/new-create by phone — so stay
        // history (GuestService.stayHistory) works without staff managing guests
        // as a separate step.
        UUID guestId = req.getGuestId() != null ? req.getGuestId()
            : optId(guestService.findOrCreate(req.getHotelId(), req.getGuestName(), req.getGuestPhone()));

        Reservation reservation = reservationRepo.save(Reservation.builder()
            .hotelId(req.getHotelId())
            .guestId(guestId)
            .groupId(req.getGroupId())
            .agentId(req.getAgentId())
            .guestName(req.getGuestName())
            .guestPhone(req.getGuestPhone())
            .checkInDate(req.getCheckInDate())
            .checkOutDate(req.getCheckOutDate())
            .adults(req.getAdults() != null ? req.getAdults() : 1)
            .children(req.getChildren() != null ? req.getChildren() : 0)
            .source(source)
            .notes(req.getNotes())
            .createdBy(createdBy)
            .build());

        Set<UUID> claimedThisRequest = new HashSet<>();
        BigDecimal totalRoomRevenue = BigDecimal.ZERO;
        long nights = ChronoUnit.DAYS.between(req.getCheckInDate(), req.getCheckOutDate());
        for (CreateReservationRequest.RoomBooking rb : req.getRooms()) {
            ratePlanService.validateStay(rb.getRatePlanId(), req.getCheckInDate(), req.getCheckOutDate());
            BigDecimal rate = ratePlanService.totalForStay(rb.getRatePlanId(), req.getCheckInDate(), req.getCheckOutDate());
            BigDecimal perNight = nights > 0 ? rate.divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP) : rate;
            assignRoom(reservation.getId(), req.getHotelId(), rb.getRoomTypeId(), rb.getRatePlanId(),
                req.getCheckInDate(), req.getCheckOutDate(), perNight, claimedThisRequest);
            totalRoomRevenue = totalRoomRevenue.add(perNight.multiply(BigDecimal.valueOf(nights)));
        }

        if (req.getAgentId() != null) {
            commissionService.recordForBooking(req.getHotelId(), reservation.getId(), req.getAgentId(),
                totalRoomRevenue, req.getCommissionPercentOverride());
        }

        return reservation;
    }

    /** OTA/channel-manager bookings arrive with their own contracted per-night rate
     *  instead of one of our RatePlans, but need the same room-assignment/availability
     *  guarantees as a direct booking — see ChannelService for the mapping + idempotency
     *  layer above this. */
    @Transactional
    public Reservation createFromChannel(UUID hotelId, String guestName, String guestPhone,
                                          LocalDate checkIn, LocalDate checkOut, int adults, int children,
                                          String notes, List<ChannelRoomLine> lines) {
        if (lines == null || lines.isEmpty())
            throw new RuntimeException("At least one room line is required");
        if (!checkIn.isBefore(checkOut))
            throw new RuntimeException("checkOutDate must be after checkInDate");

        Reservation reservation = reservationRepo.save(Reservation.builder()
            .hotelId(hotelId).guestId(optId(guestService.findOrCreate(hotelId, guestName, guestPhone)))
            .guestName(guestName).guestPhone(guestPhone)
            .checkInDate(checkIn).checkOutDate(checkOut)
            .adults(adults > 0 ? adults : 1).children(Math.max(children, 0))
            .source(ReservationSource.OTA).notes(notes).createdBy("channel-manager")
            .build());

        Set<UUID> claimedThisRequest = new HashSet<>();
        for (ChannelRoomLine line : lines) {
            assignRoom(reservation.getId(), hotelId, line.roomTypeId(), null,
                checkIn, checkOut, line.ratePerNight(), claimedThisRequest);
        }

        return reservation;
    }

    public record ChannelRoomLine(UUID roomTypeId, BigDecimal ratePerNight) {}

    private UUID optId(Guest guest) { return guest != null ? guest.getId() : null; }

    private void assignRoom(UUID reservationId, UUID hotelId, UUID roomTypeId, UUID ratePlanId,
                             LocalDate checkIn, LocalDate checkOut, BigDecimal ratePerNight,
                             Set<UUID> claimedThisRequest) {
        // Rooms already claimed by an earlier line in this same request must be excluded
        // too, or two rooms of the same type in one booking could double-book one room.
        HotelRoomDto room = availabilityService.availableRooms(hotelId, roomTypeId, checkIn, checkOut)
            .stream()
            .filter(r -> !claimedThisRequest.contains(r.getId()))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("No available room for room type " + roomTypeId));
        claimedThisRequest.add(room.getId());

        roomReservationRepo.save(RoomReservation.builder()
            .reservationId(reservationId)
            .roomTypeId(roomTypeId)
            .ratePlanId(ratePlanId)
            .roomId(room.getId())
            .roomNumber(room.getRoomNumber())
            .ratePerNight(ratePerNight)
            .build());
    }

    public List<RoomReservation> rooms(UUID reservationId) {
        return roomReservationRepo.findByReservationId(reservationId);
    }

    @Transactional
    public Reservation checkIn(UUID reservationId) {
        Reservation reservation = get(reservationId);
        if (reservation.getStatus() != ReservationStatus.BOOKED)
            throw new RuntimeException("Only a BOOKED reservation can be checked in");

        List<RoomReservation> rooms = roomReservationRepo.findByReservationId(reservationId);
        LocalDateTime now = LocalDateTime.now();
        long nights = ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate());
        BigDecimal totalRoomRevenue = BigDecimal.ZERO;
        for (RoomReservation rr : rooms) {
            rr.setActualCheckInAt(now);
            roomReservationRepo.save(rr);
            hotelServiceClient.updateRoomOccupancy(rr.getRoomId(), reservation.getGuestName(),
                reservation.getCheckInDate().toString(), reservation.getCheckOutDate().toString(), "OCCUPIED");
            // Post the full stay's room charge to the folio at check-in — a nightly
            // auto-posting job is a fair follow-up, not needed for the front-desk MVP.
            BigDecimal roomCharge = rr.getRatePerNight().multiply(BigDecimal.valueOf(nights));
            folioService.addCharge(reservationId, rr.getId(), FolioChargeType.ROOM,
                "Room " + rr.getRoomNumber() + " (" + nights + " night(s))", roomCharge);
            totalRoomRevenue = totalRoomRevenue.add(roomCharge);
        }
        // Hotel-wide surcharges (city tax, resort fee, ...) apply to every stay —
        // see SurchargeService.
        surchargeService.applyAllToReservation(reservation.getHotelId(), reservationId, totalRoomRevenue, nights);

        reservation.setStatus(ReservationStatus.CHECKED_IN);
        return reservationRepo.save(reservation);
    }

    @Transactional
    public Reservation checkOut(UUID reservationId) {
        Reservation reservation = get(reservationId);
        if (reservation.getStatus() != ReservationStatus.CHECKED_IN)
            throw new RuntimeException("Only a CHECKED_IN reservation can be checked out");

        List<RoomReservation> rooms = roomReservationRepo.findByReservationId(reservationId);
        LocalDateTime now = LocalDateTime.now();
        for (RoomReservation rr : rooms) {
            rr.setActualCheckOutAt(now);
            roomReservationRepo.save(rr);
            hotelServiceClient.updateRoomOccupancy(rr.getRoomId(), null, null, null, "VACANT");
        }

        reservation.setStatus(ReservationStatus.CHECKED_OUT);
        Reservation saved = reservationRepo.save(reservation);
        // A guest's folio is settled by checkout time in the common case, so this is
        // the natural point to lock in a permanent invoice number (see InvoiceService —
        // idempotent, so a re-checkout attempt never burns a second sequence value).
        invoiceService.generateForReservation(reservation.getHotelId(), reservationId);
        loyaltyService.earnPointsForStay(reservation.getHotelId(), reservation.getGuestId(), folioService.roomRevenue(reservationId));
        return saved;
    }

    /** Extends an in-house stay's checkout date — CRS's actual ReservationExtension
     *  entity turned out to just be property-level check-in/out TIME policy (which
     *  Hotel.checkInTime/checkOutTime already covers), not this; this is the genuinely
     *  useful capability that name implies, designed fresh against this data model.
     *  Checks each assigned room specifically (not just its room type) is free for the
     *  added nights, then posts the extra room charge and syncs the new checkout date
     *  to hotel-service. */
    @Transactional
    public Reservation extendStay(UUID reservationId, LocalDate newCheckOutDate) {
        Reservation reservation = get(reservationId);
        if (reservation.getStatus() != ReservationStatus.CHECKED_IN)
            throw new RuntimeException("Only a CHECKED_IN reservation can be extended");
        if (!newCheckOutDate.isAfter(reservation.getCheckOutDate()))
            throw new RuntimeException("New checkout date must be after the current one");

        List<RoomReservation> rooms = roomReservationRepo.findByReservationId(reservationId);
        for (RoomReservation rr : rooms) {
            List<RoomReservation> conflicts = roomReservationRepo.findConflictingForExtension(
                rr.getRoomId(), reservationId, reservation.getCheckOutDate(), newCheckOutDate);
            if (!conflicts.isEmpty())
                throw new RuntimeException("Room " + rr.getRoomNumber() + " is already booked during the requested extension");
        }

        long addedNights = ChronoUnit.DAYS.between(reservation.getCheckOutDate(), newCheckOutDate);
        for (RoomReservation rr : rooms) {
            BigDecimal extraCharge = rr.getRatePerNight().multiply(BigDecimal.valueOf(addedNights));
            folioService.addCharge(reservationId, rr.getId(), FolioChargeType.ROOM,
                "Room " + rr.getRoomNumber() + " extension (" + addedNights + " night(s))", extraCharge);
        }

        reservation.setCheckOutDate(newCheckOutDate);
        Reservation saved = reservationRepo.save(reservation);
        for (RoomReservation rr : rooms) {
            hotelServiceClient.updateRoomOccupancy(rr.getRoomId(), reservation.getGuestName(),
                reservation.getCheckInDate().toString(), newCheckOutDate.toString(), "OCCUPIED");
        }
        return saved;
    }

    /** Public — verifies the caller knows the phone on file for this booking (see
     *  ContactlessCheckInRequest), then records ID-proof details on the linked Guest
     *  and flags the reservation as pre-checked-in so front-desk can fast-track the
     *  actual check-in. */
    @Transactional
    public Reservation preCheckIn(UUID reservationId, String phone, String idProofType, String idProofNumber,
                                   String address, String signatureData) {
        Reservation reservation = get(reservationId);
        if (reservation.getStatus() != ReservationStatus.BOOKED)
            throw new RuntimeException("Only an upcoming (BOOKED) reservation can be pre-checked-in");
        verifyGuestPhone(reservation, phone);
        if (reservation.getGuestId() != null) {
            guestService.updateIdProof(reservation.getGuestId(), idProofType, idProofNumber, address);
        }
        registrationCardService.save(reservation.getHotelId(), reservationId, reservation.getGuestName(),
            idProofType, idProofNumber, address, signatureData);
        reservation.setPreCheckedIn(true);
        reservation.setPreCheckInAt(LocalDateTime.now());
        return reservationRepo.save(reservation);
    }

    /** Same phone check, for the guest-facing summary screen shown before they submit. */
    public Reservation getForGuest(UUID reservationId, String phone) {
        Reservation reservation = get(reservationId);
        verifyGuestPhone(reservation, phone);
        return reservation;
    }

    private void verifyGuestPhone(Reservation reservation, String phone) {
        if (reservation.getGuestPhone() == null || phone == null
                || !reservation.getGuestPhone().trim().equalsIgnoreCase(phone.trim())) {
            throw new RuntimeException("Phone number does not match this booking");
        }
    }

    @Transactional
    public Reservation cancel(UUID reservationId) {
        Reservation reservation = get(reservationId);
        if (reservation.getStatus() != ReservationStatus.BOOKED)
            throw new RuntimeException("Only a BOOKED reservation can be cancelled");
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelledAt(LocalDateTime.now());
        commissionService.voidForReservation(reservationId);
        return reservationRepo.save(reservation);
    }

    @Transactional
    public Reservation noShow(UUID reservationId) {
        Reservation reservation = get(reservationId);
        if (reservation.getStatus() != ReservationStatus.BOOKED)
            throw new RuntimeException("Only a BOOKED reservation can be marked no-show");
        reservation.setStatus(ReservationStatus.NO_SHOW);
        // Room revenue was never actually collected for a no-show, so any commission
        // booked at creation time against the quoted rate is voided too.
        commissionService.voidForReservation(reservationId);
        return reservationRepo.save(reservation);
    }

    public Reservation get(UUID id) {
        return reservationRepo.findById(id).orElseThrow(() -> new RuntimeException("Reservation not found: " + id));
    }

    public List<Reservation> forHotel(UUID hotelId) {
        return reservationRepo.findByHotelIdOrderByCreatedAtDesc(hotelId);
    }
}
