package in.aviqr.paymentgateway.gateway;

/** A payment that can't start or be read; the message is safe to show staff. */
public class GatewayException extends RuntimeException {
    public GatewayException(String message) { super(message); }
    public GatewayException(String message, Throwable cause) { super(message, cause); }
}
