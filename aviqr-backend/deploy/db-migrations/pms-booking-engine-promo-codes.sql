-- database: aviqr_pms
-- Guest-enterable promo codes for the public booking engine (aviqr_pms database).
-- Run BEFORE deploying the pms-service build that includes PromoCode: production uses ddl-auto=none.
CREATE TABLE IF NOT EXISTS pms_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    code VARCHAR(32) NOT NULL,
    discount_package_id UUID NOT NULL,
    valid_from DATE,
    valid_to DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now(),
    CONSTRAINT uk_pms_promo_codes_hotel_code UNIQUE (hotel_id, code)
);
CREATE INDEX IF NOT EXISTS idx_pms_promo_codes_hotel ON pms_promo_codes(hotel_id);
