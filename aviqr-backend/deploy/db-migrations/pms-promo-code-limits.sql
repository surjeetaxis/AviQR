-- database: aviqr_pms
-- Promo code usage limits and stay conditions.
ALTER TABLE pms_promo_codes ADD COLUMN IF NOT EXISTS max_uses INTEGER;
ALTER TABLE pms_promo_codes ADD COLUMN IF NOT EXISTS used_count INTEGER DEFAULT 0;
ALTER TABLE pms_promo_codes ADD COLUMN IF NOT EXISTS min_nights INTEGER;
ALTER TABLE pms_promo_codes ADD COLUMN IF NOT EXISTS min_amount NUMERIC(10,2);
