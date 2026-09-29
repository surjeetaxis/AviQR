-- ==============================================================================
--  aviqr_pms_axisrooms_cm_integration.sql — schema changes for the AxisRooms
--  channel-manager integration (AviQR acting as the hotel's PMS), for the
--  aviqr_pms database.
--
--  Production runs pms-service with ddl-auto=none, so these are not applied
--  automatically there (dev/staging with ddl-auto=update add the column on
--  their own, but NOT the enum constraint change below).
--
--  1. pms_channel_mappings.internal_rate_plan_id — which AviQR rate plan feeds
--     a mapping's AxisRooms rate plan (ChannelMapping.internalRatePlanId).
--  2. ChannelName gained AXISROOMS. Hibernate 6 creates a CHECK constraint
--     listing the enum values on every @Enumerated(STRING) column it creates,
--     so the channel columns of the three channel tables would reject
--     'AXISROOMS'. Any such constraint is dropped and recreated with the new
--     value list.
--
--  Safe to re-run.
--
--  Run as: sudo -u postgres psql -d aviqr_pms -f aviqr_pms_axisrooms_cm_integration.sql
-- ==============================================================================

BEGIN;

ALTER TABLE pms_channel_mappings ADD COLUMN IF NOT EXISTS internal_rate_plan_id uuid;

DO $$
DECLARE
    t text;
    c record;
    had_check boolean;
BEGIN
    FOREACH t IN ARRAY ARRAY['pms_channel_mappings', 'pms_channel_bookings', 'pms_channel_sync_logs'] LOOP
        IF to_regclass(t) IS NULL THEN
            CONTINUE;
        END IF;
        had_check := false;
        FOR c IN
            SELECT con.conname
            FROM pg_constraint con
            WHERE con.conrelid = t::regclass
              AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ILIKE '%channel%'
        LOOP
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', t, c.conname);
            had_check := true;
        END LOOP;
        -- Tables created by aviqr_setup.sql have no such constraint; don't add one.
        CONTINUE WHEN NOT had_check;
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I CHECK (channel IN (''BOOKING_COM'', ''MMT'', ''AGODA'', ''EXPEDIA'', ''GENERIC'', ''AXISROOMS''))',
            t, t || '_channel_check');
    END LOOP;
END $$;

COMMIT;
