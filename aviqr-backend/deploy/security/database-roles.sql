-- Apply per database as an operator, using quoted psql identifier variables.
-- psql -v app_role=auth_runtime -v migration_role=auth_migrator -v db_name=auth_db -f database-roles.sql
-- Provision role passwords through your secret manager / psql \password, never command arguments.
CREATE ROLE :"app_role" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE :"migration_role" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"app_role", :"migration_role";
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"app_role";
GRANT USAGE, CREATE ON SCHEMA public TO :"migration_role";
-- Transfer application tables to the migration role; runtime must never own them.
SELECT format('ALTER TABLE public.%I OWNER TO %I',tablename, :'migration_role') FROM pg_tables WHERE schemaname='public' \gexec
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO :"app_role";
ALTER DEFAULT PRIVILEGES FOR ROLE :"migration_role" IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO :"app_role";
-- Auth DB only: run these after migration 005. PostgreSQL trigger also blocks history edits.
SELECT format('REVOKE UPDATE, DELETE ON public.login_security_records FROM %I', :'app_role') WHERE to_regclass('public.login_security_records') IS NOT NULL \gexec
SELECT format('GRANT UPDATE (status) ON public.login_security_records TO %I', :'app_role') WHERE to_regclass('public.login_security_records') IS NOT NULL \gexec

-- The migration ledger is maintained only by the migrator.
SELECT format('REVOKE ALL ON public.databasechangelog FROM %I', :'app_role') WHERE to_regclass('public.databasechangelog') IS NOT NULL \gexec
SELECT format('REVOKE ALL ON public.databasechangeloglock FROM %I', :'app_role') WHERE to_regclass('public.databasechangeloglock') IS NOT NULL \gexec
