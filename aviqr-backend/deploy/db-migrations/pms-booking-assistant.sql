-- database: aviqr_pms
-- Booking assistant: website chat and WhatsApp settings, and WhatsApp conversations.
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS whatsapp_bot_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id VARCHAR(40);
ALTER TABLE pms_booking_engine_settings ADD COLUMN IF NOT EXISTS whatsapp_access_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pms_booking_engine_settings_wa_phone ON pms_booking_engine_settings(whatsapp_phone_number_id) WHERE whatsapp_phone_number_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS pms_chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    contact VARCHAR(32) NOT NULL,
    turns TEXT,
    updated_at TIMESTAMP,
    CONSTRAINT uk_pms_chat_conversations_hotel_contact UNIQUE (hotel_id, contact)
);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_pms_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pms_chat_conversations TO aviqr_pms_runtime_v1;
    END IF;
END $$;
