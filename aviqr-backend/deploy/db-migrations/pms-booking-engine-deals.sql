-- database: aviqr_pms
-- Booking-engine deals: offers applied automatically, without a code.
CREATE TABLE IF NOT EXISTS pms_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    name VARCHAR(80) NOT NULL,
    description VARCHAR(200),
    value_type VARCHAR(255) NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    stay_from DATE,
    stay_to DATE,
    book_from DATE,
    book_to DATE,
    min_nights INTEGER,
    min_days_ahead INTEGER,
    max_days_ahead INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pms_deals_hotel ON pms_deals(hotel_id);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_pms_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pms_deals TO aviqr_pms_runtime_v1;
    END IF;
END $$;
