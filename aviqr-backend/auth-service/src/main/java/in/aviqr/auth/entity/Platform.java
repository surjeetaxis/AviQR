package in.aviqr.auth.entity;

public enum Platform {
    WEB, ANDROID, IOS, UNKNOWN;

    public static Platform from(String value) {
        if (value == null || value.isBlank()) return UNKNOWN;
        try { return Platform.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { return UNKNOWN; }
    }
}
