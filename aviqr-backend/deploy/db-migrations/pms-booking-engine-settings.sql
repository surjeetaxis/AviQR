-- database: aviqr_pms
-- Hotel policies, default cancellation policy and terms shown on the public booking engine.
CREATE TABLE IF NOT EXISTS pms_booking_engine_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL UNIQUE,
    hotel_policies TEXT,
    cancellation_policy TEXT,
    terms_and_conditions TEXT,
    require_terms_acceptance BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT now()
);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_pms_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pms_booking_engine_settings TO aviqr_pms_runtime_v1;
    END IF;
END $$;
