-- Owner-configurable OTA listing and white-label booking-engine storefront.
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_brand_name VARCHAR(100);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_primary_color VARCHAR(7);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_accent_color VARCHAR(7);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_logo_url VARCHAR(1000);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_slug VARCHAR(63);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_custom_domain VARCHAR(253);
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS booking_engine_support_email VARCHAR(254);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hotels_booking_engine_slug
    ON hotels (lower(booking_engine_slug)) WHERE booking_engine_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hotels_booking_engine_custom_domain
    ON hotels (lower(booking_engine_custom_domain)) WHERE booking_engine_custom_domain IS NOT NULL;
