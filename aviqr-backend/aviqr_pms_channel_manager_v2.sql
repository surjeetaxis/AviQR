-- ==============================================================================
--  aviqr_pms_channel_manager_v2.sql — Channel Manager page (selective sync,
--  channel calendar, filterable sync logs, channel bookings), for aviqr_pms.
--
--  Production runs pms-service with ddl-auto=none: run this BEFORE deploying the
--  pms-service build that contains ChannelManagerController.
--
--  1. pms_channel_sync_logs: what each row covers (sync type, property, room
--     types, date range, trigger) + request/response bodies (older DBs built
--     from aviqr_setup.sql may lack them).
--  2. pms_channel_bookings: hotel, OTA name, last status, last update — backfilled
--     from the linked reservation for rows that already exist.
--  3. SyncStatus gained SKIPPED: a Hibernate-generated CHECK on status (if any)
--     is replaced to allow it.
--
--  Safe to re-run.
--
--  Run as: sudo -u postgres psql -d aviqr_pms -f aviqr_pms_channel_manager_v2.sql
-- ==============================================================================

BEGIN;

ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS request_body         TEXT;
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS response_body        TEXT;
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS sync_type            VARCHAR(20);
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS external_property_id VARCHAR(100);
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS room_type_ids        TEXT;
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS date_from            DATE;
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS date_to              DATE;
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS trigger_source       VARCHAR(20);
ALTER TABLE pms_channel_sync_logs ADD COLUMN IF NOT EXISTS triggered_by         VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_pms_channel_log_hotel ON pms_channel_sync_logs (hotel_id, created_at DESC);

ALTER TABLE pms_channel_bookings ADD COLUMN IF NOT EXISTS hotel_id    UUID;
ALTER TABLE pms_channel_bookings ADD COLUMN IF NOT EXISTS ota         VARCHAR(100);
ALTER TABLE pms_channel_bookings ADD COLUMN IF NOT EXISTS last_status VARCHAR(20);
ALTER TABLE pms_channel_bookings ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_pms_channel_bookings_hotel ON pms_channel_bookings (hotel_id, created_at DESC);

UPDATE pms_channel_bookings b
   SET hotel_id    = r.hotel_id,
       last_status = COALESCE(b.last_status, CASE WHEN r.status = 'CANCELLED' THEN 'cancelled' ELSE 'confirmed' END),
       updated_at  = COALESCE(b.updated_at, b.created_at)
  FROM pms_reservations r
 WHERE r.id = b.reservation_id
   AND b.hotel_id IS NULL;

DO $$
DECLARE
    c record;
    had_check boolean := false;
BEGIN
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        WHERE con.conrelid = 'pms_channel_sync_logs'::regclass
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%status%'
          AND pg_get_constraintdef(con.oid) ILIKE '%FAILED%'
    LOOP
        EXECUTE format('ALTER TABLE pms_channel_sync_logs DROP CONSTRAINT %I', c.conname);
        had_check := true;
    END LOOP;
    -- Only replace a constraint Hibernate created; tables from aviqr_setup.sql have none.
    IF had_check THEN
        ALTER TABLE pms_channel_sync_logs ADD CONSTRAINT pms_channel_sync_logs_status_check
            CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED'));
    END IF;
END $$;

COMMIT;
