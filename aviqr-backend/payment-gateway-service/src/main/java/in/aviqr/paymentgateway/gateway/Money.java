package in.aviqr.paymentgateway.gateway;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

/** Amount formats the gateways expect. */
public final class Money {
    private Money() {}

    public static int digits(String currency) {
        try {
            int d = Currency.getInstance(currency).getDefaultFractionDigits();
            return d < 0 ? 2 : d;
        } catch (IllegalArgumentException e) {
            return 2;
        }
    }

    /** In the currency's smallest unit, e.g. ₹1,500.50 → 150050. */
    public static long minor(BigDecimal amount, String currency) {
        return amount.setScale(digits(currency), RoundingMode.HALF_UP).movePointRight(digits(currency)).longValueExact();
    }

    /** In major units with the currency's decimals, e.g. "1500.50". */
    public static String major(BigDecimal amount, String currency) {
        return amount.setScale(digits(currency), RoundingMode.HALF_UP).toPlainString();
    }

    /** Minor units left-padded with zeros to 12 digits (FAC/MPI-style gateways). */
    public static String minor12(BigDecimal amount, String currency) {
        return String.format("%012d", minor(amount, currency));
    }

    /** ISO 4217 numeric code, e.g. INR → "356". */
    public static String numeric(String currency) {
        try {
            return String.format("%03d", Currency.getInstance(currency).getNumericCode());
        } catch (IllegalArgumentException e) {
            throw new GatewayException("Unsupported currency " + currency);
        }
    }

    /** Parses a gateway-reported amount, or null when it isn't a number. */
    public static BigDecimal parse(String value) {
        try {
            return value == null || value.isBlank() ? null : new BigDecimal(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static BigDecimal fromMinor(String value, String currency) {
        BigDecimal minor = parse(value);
        return minor == null ? null : minor.movePointLeft(digits(currency));
    }
}
