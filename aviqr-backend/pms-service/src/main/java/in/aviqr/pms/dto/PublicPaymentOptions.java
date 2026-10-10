package in.aviqr.pms.dto;

/** How a guest can pay on the booking engine. mode is PAY_AT_HOTEL whenever the hotel has no
 *  working online gateway, whatever its settings say. */
public record PublicPaymentOptions(String mode, int depositPercent, String gateway) {
    public static final PublicPaymentOptions AT_HOTEL = new PublicPaymentOptions("PAY_AT_HOTEL", 100, null);
}
