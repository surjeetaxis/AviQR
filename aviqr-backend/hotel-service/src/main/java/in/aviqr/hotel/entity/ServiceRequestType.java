package in.aviqr.hotel.entity;

public enum ServiceRequestType {
    HOUSEKEEPING,      // clean room, make bed
    AMENITIES,         // towels, toiletries, pillows
    MAINTENANCE,       // AC, plumbing, electrical
    CONCIERGE,         // recommendations, bookings, taxi
    LAUNDRY,           // laundry pickup
    WAKE_UP_CALL,      // wake-up call request
    LATE_CHECKOUT,     // request late checkout
    TRANSPORT,         // airport pickup / cab
    OTHER
}
