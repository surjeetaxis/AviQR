#!/bin/bash
# ==============================================================================
#  apply-db-migrations.sh — applies deploy/db-migrations/*.sql before services
#  restart. Called by deploy.sh; safe to run by hand.
#
#  Usage: apply-db-migrations.sh            apply pending migrations
#         apply-db-migrations.sh --check    list pending migrations, change nothing
#
#  Each file must start with a header naming its database:
#      -- database: aviqr_pms
#  Files run in name order, each in its own transaction, as the migration role
#  (default "aviqr", the owner of every application table) so new objects get the
#  same owner as existing ones. Applied files are recorded with their checksum in
#  aviqr_schema_migrations in that database; a file runs again only if it changes,
#  so keep every migration idempotent (IF NOT EXISTS etc.).
#
#  Production services use ddl-auto=none, so code that needs a column or table
#  this hasn't created yet fails at runtime; deploy.sh runs this first for that
#  reason. Runtime roles are least-privilege (security/database-roles.sql): a
#  migration that creates a table must also grant the runtime role access to it.
# ==============================================================================
set -euo pipefail

DIR="${AVIQR_MIGRATIONS_DIR:-$(cd "$(dirname "$0")" && pwd)/db-migrations}"
ROLE="${AVIQR_MIGRATION_ROLE:-aviqr}"
read -r -a PSQL <<< "${AVIQR_PSQL:-sudo -u postgres psql}"
PSQL+=(-X -q -v ON_ERROR_STOP=1)
LEDGER=aviqr_schema_migrations
MODE="${1:-apply}"

log() { echo "[migrations] $*"; }
fail() { echo "[migrations] ERROR: $*" >&2; exit 1; }

[[ "$MODE" == apply || "$MODE" == --check ]] || fail "unknown option '$MODE'"
[[ "$ROLE" =~ ^[a-z_][a-z0-9_]*$ ]] || fail "invalid migration role '$ROLE'"
shopt -s nullglob
files=("$DIR"/*.sql)
[ ${#files[@]} -gt 0 ] || { log "no migrations in $DIR"; exit 0; }

pending=0
for file in "${files[@]}"; do
  name=$(basename "$file")
  # The validated name is safe to embed in SQL literals below.
  [[ "$name" =~ ^[a-z0-9][a-z0-9._-]*\.sql$ ]] || fail "$name: file names must be lowercase letters, digits, '.', '-' or '_'"
  db=$(sed -n 's/^--[[:space:]]*database:[[:space:]]*\([A-Za-z0-9_]*\)[[:space:]]*$/\1/p' "$file" | head -1)
  [[ "$db" =~ ^aviqr_[a-z_]+$ ]] || fail "$name: missing or invalid '-- database: aviqr_<name>' header"
  sum=$(sha256sum "$file" | cut -d' ' -f1)

  "${PSQL[@]}" -d "$db" -c "SET client_min_messages = warning" -c "CREATE TABLE IF NOT EXISTS public.$LEDGER (filename TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())" \
    || fail "could not reach $db for $name"
  applied=$("${PSQL[@]}" -d "$db" -At -c "SELECT checksum FROM public.$LEDGER WHERE filename = '$name'")
  [ "$applied" = "$sum" ] && continue

  pending=$((pending + 1))
  if [ "$MODE" = --check ]; then
    log "pending: $name -> $db${applied:+ (changed since it was applied)}"
    continue
  fi
  log "applying $name to $db${applied:+ (file changed since last applied)}"
  "${PSQL[@]}" -d "$db" --single-transaction \
    -c "SET client_min_messages = warning" -c "SET ROLE \"$ROLE\"" -f "$file" -c "RESET ROLE" \
    -c "INSERT INTO public.$LEDGER (filename, checksum) VALUES ('$name', '$sum') ON CONFLICT (filename) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = now()" \
    || fail "$name failed on $db; nothing from that file was committed"
done

if [ "$MODE" = --check ]; then log "$pending pending migration(s)"; else log "done: $pending migration(s) applied"; fi
