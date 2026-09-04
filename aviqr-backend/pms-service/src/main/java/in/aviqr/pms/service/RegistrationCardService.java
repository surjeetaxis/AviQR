package in.aviqr.pms.service;

import in.aviqr.pms.entity.RegistrationCard;
import in.aviqr.pms.repository.RegistrationCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class RegistrationCardService {

    private final RegistrationCardRepository cardRepo;

    /** Idempotent — a re-submitted pre-check-in just overwrites the signed card
     *  rather than erroring, since the guest may legitimately redo it (typo fix). */
    public RegistrationCard save(UUID hotelId, UUID reservationId, String guestName,
                                  String idProofType, String idProofNumber, String address, String signatureData) {
        RegistrationCard card = cardRepo.findByReservationId(reservationId)
            .orElse(RegistrationCard.builder().hotelId(hotelId).reservationId(reservationId).build());
        card.setGuestName(guestName);
        card.setIdProofType(idProofType);
        card.setIdProofNumber(idProofNumber);
        card.setAddress(address);
        if (signatureData != null && !signatureData.isBlank()) card.setSignatureData(signatureData);
        return cardRepo.save(card);
    }

    public RegistrationCard get(UUID reservationId) {
        return cardRepo.findByReservationId(reservationId)
            .orElseThrow(() -> new RuntimeException("No registration card on file for reservation " + reservationId));
    }
}
