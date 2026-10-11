package in.aviqr.paymentgateway.gateway;

import java.math.BigDecimal;

/** What a gateway's response means. paidAmount, when the gateway reports one, is checked against the transaction. */
public record Outcome(Status status, String pgTransactionId, String bankTransactionId, String message, BigDecimal paidAmount) {
    public enum Status { PAID, FAILED, PENDING, UNVERIFIED }
    public static Outcome paid(String pgTxn, String bankTxn, BigDecimal amount) { return new Outcome(Status.PAID, pgTxn, bankTxn, null, amount); }
    public static Outcome failed(String message) { return new Outcome(Status.FAILED, null, null, message, null); }
    public static Outcome failed(String pgTxn, String message) { return new Outcome(Status.FAILED, pgTxn, null, message, null); }
    public static Outcome pending(String message) { return new Outcome(Status.PENDING, null, null, message, null); }
    /** The gateway says it succeeded but nothing proves it; staff confirm in the gateway's dashboard. */
    public static Outcome unverified(String pgTxn, String message) { return new Outcome(Status.UNVERIFIED, pgTxn, null, message, null); }
    /** A result that says success: PAID when verified, otherwise UNVERIFIED. */
    public static Outcome success(boolean verified, String pgTxn, String bankTxn, BigDecimal amount) {
        return verified ? paid(pgTxn, bankTxn, amount) : new Outcome(Status.UNVERIFIED, pgTxn, bankTxn, "Signature missing or invalid", amount);
    }
}
