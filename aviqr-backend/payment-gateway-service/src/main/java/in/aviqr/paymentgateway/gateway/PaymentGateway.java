package in.aviqr.paymentgateway.gateway;

/** Gateways a hotel can take online payments through. All but PAYPAL and RAZORPAY
 *  were ported from the legacy AxisRooms payment-service (its PHM entry never had an
 *  implementation, so it has none here either). */
public enum PaymentGateway {
    RAZORPAY, PAYPAL, SUPPLIER_PAYTM, AIRPAY, AGGREPAY, YES_BANK, BOB, SAFEXPAY, GOPES,
    GLOBAL, GLOBALPAY_UK, COMBANK, SAMPATH, SENTRY, WEBX_PAY, BML, ASIAPAY, PAY_TABS,
    MOBIVERSA, ACCOMCLICK, AGODAPAY
}
