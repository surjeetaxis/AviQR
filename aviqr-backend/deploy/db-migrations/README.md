# Database migrations

`deploy.sh` runs `../apply-db-migrations.sh` after building and before restarting any
service, so schema changes are in place before new code needs them. Production uses
`ddl-auto=none`; a column the code expects but the database lacks breaks every query
on that table.

Rules for every file here:

- **First line names the database:** `-- database: aviqr_pms` (or `aviqr_hotel`, ...).
  A file without it stops the deploy.
- **Idempotent and additive:** use `IF NOT EXISTS` and avoid destructive changes. Old
  service instances keep running during the blue/green switch, and a rollback leaves
  the schema in place.
- **Name files so they sort in the order they must run.** Each runs once, in its own
  transaction, as the migration role (`aviqr`). Editing an applied file makes it run
  again on the next deploy.
- **New tables need a runtime grant.** Services connect as least-privilege roles (see
  `../security/database-roles.sql`), and these databases have no default privileges,
  so a migration that creates a table must also `GRANT SELECT, INSERT, UPDATE, DELETE`
  on it to that service's runtime role.

Check what a deploy would apply, without changing anything:

    sudo bash aviqr-backend/deploy/apply-db-migrations.sh --check

Applied files are recorded in `aviqr_schema_migrations` in each database.
