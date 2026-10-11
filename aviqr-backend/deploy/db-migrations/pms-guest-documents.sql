-- database: aviqr_pms
-- Encrypted guest ID scans captured at check-in (GuestDocumentService). Content is
-- AES-GCM ciphertext; the key is PMS_DOCUMENT_KEY in the service environment.
CREATE TABLE IF NOT EXISTS pms_guest_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL,
    reservation_id UUID NOT NULL,
    doc_type VARCHAR(40) NOT NULL,
    content_type VARCHAR(60) NOT NULL,
    size_bytes INTEGER NOT NULL,
    iv BYTEA NOT NULL,
    content BYTEA NOT NULL,
    uploaded_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pms_guest_documents_reservation ON pms_guest_documents(reservation_id);
-- The PMS connects as a least-privilege runtime role (security/database-roles.sql);
-- environments without that role (local dev) skip the grant.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aviqr_pms_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON pms_guest_documents TO aviqr_pms_runtime_v1;
    END IF;
END $$;
