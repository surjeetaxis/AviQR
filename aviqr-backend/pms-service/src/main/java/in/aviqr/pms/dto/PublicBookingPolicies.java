package in.aviqr.pms.dto;

/** The hotel's policies and terms as shown to guests on the booking engine. */
public record PublicBookingPolicies(String hotelPolicies, String cancellationPolicy, String termsAndConditions,
                                    boolean termsRequired) {
    public static final PublicBookingPolicies NONE = new PublicBookingPolicies(null, null, null, false);
}
