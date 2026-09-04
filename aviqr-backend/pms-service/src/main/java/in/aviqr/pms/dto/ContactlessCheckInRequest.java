package in.aviqr.pms.dto;

import lombok.Data;

/** Public pre-arrival submission — phone is the auth check (the guest received this
 *  reservation id via their confirmation email/SMS and must also know the phone
 *  number on file, same low-friction "booking ref + last name/phone" pattern real
 *  hotel portals use). */
@Data
public class ContactlessCheckInRequest {
    private String phone;
    private String idProofType;
    private String idProofNumber;
    private String address;
    // Base64 PNG data URL of the guest's drawn signature — the digital
    // registration card. Deliberately never logged (see ReservationService).
    private String signatureData;
}
