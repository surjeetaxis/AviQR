-- database: aviqr_pms
-- Group quote requests from the booking engine.
CREATE TABLE IF NOT EXISTS pms_group_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    organizer_name VARCHAR(120) NOT NULL,
    organizer_phone VARCHAR(32) NOT NULL,
    organizer_email VARCHAR(254),
    company VARCHAR(120),
    event_type VARCHAR(16),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    rooms INTEGER NOT NULL,
    guests INTEGER,
    message VARCHAR(1000),
    status VARCHAR(8) DEFAULT 'NEW',
    group_id UUID,
    staff_notes VARCHAR(500),
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pms_group_enquiries_hotel ON pms_group_enquiries(hotel_id, created_at DESC);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_pms_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pms_group_enquiries TO aviqr_pms_runtime_v1;
    END IF;
END $$;
