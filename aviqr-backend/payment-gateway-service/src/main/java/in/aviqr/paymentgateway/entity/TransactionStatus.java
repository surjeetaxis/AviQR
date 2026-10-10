package in.aviqr.paymentgateway.entity;

public enum TransactionStatus {
    /** Created; the guest hasn't reached the gateway yet. */
    CREATED,
    /** The guest was sent to the gateway, or the gateway hasn't confirmed yet. */
    PENDING,
    PAID,
    FAILED,
    /** The gateway reported success but it couldn't be verified; staff confirm it. */
    UNVERIFIED;

    public boolean terminal() { return this == PAID || this == FAILED; }
}
