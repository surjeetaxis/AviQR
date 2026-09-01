package in.aviqr.shop.entity;

// SMS keeps the original behavior (TwilioSmsService). EMAIL renders
// Campaign.messageTemplate/subject into a branded HTML promotion and sends it
// via notification-report-review-service's ElasticEmailService — the natural
// channel for a NEARBY prospecting audience, since a phone number alone
// doesn't imply SMS consent the way an existing Customer record does.
public enum CampaignChannel {
    SMS, EMAIL
}
