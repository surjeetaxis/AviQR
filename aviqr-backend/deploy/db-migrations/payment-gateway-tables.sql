-- database: aviqr_payment_gateway
-- Hotels' payment gateway accounts and online payment attempts (payment-gateway-service).
-- One-time setup before the first deploy that includes payment-gateway-service:
--   sudo -u postgres createdb -O aviqr aviqr_payment_gateway
--   then security/database-roles.sql for it (app_role=aviqr_payment_gateway_runtime_v1).
CREATE TABLE IF NOT EXISTS pg_gateway_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    gateway VARCHAR(32) NOT NULL,
    credentials TEXT NOT NULL,
    test_mode BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    preferred BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT uk_pg_gateway_accounts_hotel_gateway UNIQUE (hotel_id, gateway)
);
CREATE TABLE IF NOT EXISTS pg_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) NOT NULL UNIQUE,
    hotel_id UUID NOT NULL,
    account_id UUID NOT NULL,
    gateway VARCHAR(32) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(16) NOT NULL,
    purpose VARCHAR(40),
    external_reference VARCHAR(80),
    description VARCHAR(200),
    return_url VARCHAR(1000) NOT NULL,
    guest_name VARCHAR(120),
    guest_email VARCHAR(254),
    guest_phone VARCHAR(32),
    provider_state TEXT,
    pg_transaction_id VARCHAR(120),
    bank_transaction_id VARCHAR(120),
    message VARCHAR(500),
    test_mode BOOLEAN DEFAULT FALSE,
    version BIGINT,
    created_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pg_transactions_hotel ON pg_transactions(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pg_transactions_external ON pg_transactions(external_reference);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_payment_gateway_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pg_gateway_accounts, pg_transactions TO aviqr_payment_gateway_runtime_v1;
    END IF;
END $$;
