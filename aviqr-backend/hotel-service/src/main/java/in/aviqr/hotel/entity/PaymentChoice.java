package in.aviqr.hotel.entity;

public enum PaymentChoice {
    CHARGE_TO_ROOM,    // add to room folio, settle at checkout (verified against check-in)
    PAY_DIRECT         // pay now by card / UPI / wallet
}
