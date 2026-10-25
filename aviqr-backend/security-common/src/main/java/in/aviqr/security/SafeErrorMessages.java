package in.aviqr.security;

import org.slf4j.Logger;
import java.util.Set;
import java.util.UUID;

/**
 * Decides which exception messages may be shown to API callers.
 *
 * Services throw IllegalArgumentException / IllegalStateException / plain
 * RuntimeException (or their own in.aviqr exceptions) with messages written for
 * users — "Order not found", "Room not checked in". Those pass through unchanged.
 * Anything else that reaches a handler — a database constraint violation, a
 * NullPointerException, an HTTP client error carrying an upstream body, a JSON
 * parse error — can expose table names, SQL, class names or other services'
 * responses, so the caller gets a generic message with a reference ID and the
 * detail stays in the server log under that ID.
 */
public final class SafeErrorMessages {
    private SafeErrorMessages() {}

    public static final String GENERIC = "Something went wrong. Please try again";

    private static final Set<Class<?>> USER_FACING = Set.of(
        RuntimeException.class, IllegalArgumentException.class, IllegalStateException.class);

    public static boolean isUserFacing(Throwable ex) {
        if (ex == null || ex.getMessage() == null || ex.getMessage().isBlank()) return false;
        // new RuntimeException(cause) copies cause.toString() — e.g. "java.sql.SQLException: ..." — into the message.
        if (ex.getCause() != null && ex.getMessage().equals(ex.getCause().toString())) return false;
        return USER_FACING.contains(ex.getClass()) || ex.getClass().getName().startsWith("in.aviqr.");
    }

    /** The message to send to the caller; logs the full exception when it is withheld. */
    public static String forClient(Throwable ex, Logger log) {
        if (isUserFacing(ex)) {
            log.warn("Business error: {}", ex.getMessage());
            return ex.getMessage();
        }
        String ref = UUID.randomUUID().toString().substring(0, 8);
        log.error("Unexpected error [ref {}]", ref, ex);
        return GENERIC + " (ref " + ref + ")";
    }
}
