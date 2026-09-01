package in.aviqr.shop.entity;

public enum CampaignAudienceType {
    ALL, LABEL, BIRTHDAY_TODAY, ANNIVERSARY_TODAY,
    // Customers whose default saved address (auth-service) is within
    // Campaign.radiusKm of this shop's own lat/lng — a prospecting audience,
    // not necessarily existing Customer/LoyaltyAccount records.
    NEARBY
}
