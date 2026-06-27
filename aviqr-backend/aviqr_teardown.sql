-- ============================================================
--  AviQR OS — Database Teardown (reverses aviqr_setup.sql)
--  PostgreSQL 17+
--  Run as superuser: psql -U postgres -f aviqr_teardown.sql
--
--  Drops all 11 AviQR databases (schema + dummy data + everything).
--  Does NOT drop the 'aviqr' role itself, since other tooling may
--  still reference it — re-running aviqr_setup.sql afterwards will
--  recreate the databases fresh under the same role.
--
--  WITH (FORCE) (PostgreSQL 13+) terminates any open connections to
--  the database before dropping it, so this works even if a service
--  is still running against it — make sure that's actually what you
--  want before running this against anything but local dev data.
-- ============================================================

\connect postgres

DROP DATABASE IF EXISTS aviqr_auth    WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_shop    WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_menu    WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_order   WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_payment WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_qr      WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_hotel   WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_mall    WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_support WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_report  WITH (FORCE);
DROP DATABASE IF EXISTS aviqr_review  WITH (FORCE);

-- Uncomment to also remove the role (only do this if nothing else on the
-- box depends on it — Mongo/RabbitMQ users named 'aviqr' are separate and
-- untouched either way):
-- DROP ROLE IF EXISTS aviqr;
