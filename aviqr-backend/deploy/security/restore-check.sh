#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${RESTORE_TEST_ACK:?Set RESTORE_TEST_ACK=disposable}"
[ "$RESTORE_TEST_ACK" = disposable ] || exit 1
: "${PGHOST:?Point to isolated PostgreSQL host}"
: "${PGPORT:?Point to isolated PostgreSQL port}"
# Prevent accidental execution against the ordinary local production database.
[[ "$PGHOST" = 127.0.0.1 || "$PGHOST" = localhost ]] && [ "$PGPORT" != 5432 ] || { echo 'Use an isolated loopback test database on a non-production port' >&2; exit 1; }
: "${BACKUP_GPG_HOME:?Set private test GPG directory}"
archive="${1:?Usage: restore-check.sh encrypted-pg-dump}"
archive_directory=$(cd "$(dirname "$archive")" && pwd)
(cd "$archive_directory" && shasum -a 256 -c SHA256SUMS)
raw_dump=$(mktemp)
restore_db="aviqr_restore_test_$(date +%s)_$$"
cleanup(){ dropdb --if-exists "$restore_db" >/dev/null 2>&1 || true; rm -f "$raw_dump"; }
trap cleanup EXIT
gpg --homedir "$BACKUP_GPG_HOME" --batch --yes --decrypt --output "$raw_dump" "$archive"
createdb "$restore_db"
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$restore_db" "$raw_dump"
psql --no-psqlrc --dbname="$restore_db" --set=ON_ERROR_STOP=1 --command="SELECT count(*) AS restored_application_tables FROM information_schema.tables WHERE table_schema = 'public';"
table_count=$(psql --no-psqlrc --dbname="$restore_db" --tuples-only --no-align --set=ON_ERROR_STOP=1 --command="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
[ "$table_count" -gt 0 ] || { echo 'Restore contains no application tables' >&2; exit 1; }
printf 'Disposable restore verification passed.\n' 
