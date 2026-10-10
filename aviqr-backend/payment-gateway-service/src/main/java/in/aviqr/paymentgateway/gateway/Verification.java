package in.aviqr.paymentgateway.gateway;

/** How a gateway's result is trusted. */
public enum Verification {
    /** The result carries a hash, signature or encryption only the gateway and the hotel's keys can produce. */
    SIGNED,
    /** The result is fetched from the gateway's own API server-to-server. */
    CONFIRMED_WITH_GATEWAY,
    /** The gateway's result can't be authenticated; payments are recorded for staff to confirm, never as paid. */
    UNVERIFIED
}
