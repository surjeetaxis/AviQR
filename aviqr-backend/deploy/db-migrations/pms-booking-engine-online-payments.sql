-- database: aviqr_pms
-- Online deposits / full payments at booking (OnlineBookingPaymentService), through payment-gateway-service.
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(16) DEFAULT 'PAY_AT_HOTEL';
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS deposit_percent INTEGER DEFAULT 100;
CREATE TABLE IF NOT EXISTS pms_online_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL UNIQUE,
    hotel_id UUID NOT NULL,
    payment_id UUID NOT NULL,
    payment_reference VARCHAR(20),
    gateway VARCHAR(32),
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3),
    kind VARCHAR(8),
    required BOOLEAN DEFAULT FALSE,
    status VARCHAR(16) DEFAULT 'CREATED',
    posted BOOLEAN DEFAULT FALSE,
    version BIGINT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pms_online_payments_status ON pms_online_payments(status);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_pms_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pms_online_payments TO aviqr_pms_runtime_v1;
    END IF;
END $$;
