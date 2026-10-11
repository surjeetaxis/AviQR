#!/usr/bin/env bash
# Disposable fixture only. Never point this at a production database.
set -euo pipefail
umask 077
export PGHOST=127.0.0.1 PGPORT="${AVIQR_SECURITY_TEST_PG_PORT:?Set isolated PostgreSQL port}" PGUSER="${AVIQR_SECURITY_TEST_PG_USER:-security_test}"
[ "$PGPORT" != 5432 ] || exit 1
script_dir=$(cd "$(dirname "$0")" && pwd)
test_root=$(mktemp -d)
fixture_db="aviqr_backup_fixture_$(date +%s)_$$"
cleanup(){
 dropdb --if-exists "$fixture_db" >/dev/null 2>&1 || true
 if [ -f "$test_root/mongo.pid" ]; then kill "$(cat "$test_root/mongo.pid")" 2>/dev/null || true; fi
 gpgconf --homedir "$test_root/private" --kill all >/dev/null 2>&1 || true
 gpgconf --homedir "$test_root/public" --kill all >/dev/null 2>&1 || true
 rm -rf "$test_root"
}
trap cleanup EXIT
mkdir -m 700 "$test_root/private" "$test_root/public"
gpg --homedir "$test_root/private" --batch --pinentry-mode loopback --passphrase '' --quick-generate-key 'AviQR disposable backup test <backup-test@example.invalid>' default default 0 >/dev/null 2>&1
fingerprint=$(gpg --homedir "$test_root/private" --batch --with-colons --list-keys 2>/dev/null | awk -F: '$1=="fpr" {print $10;exit}')
gpg --homedir "$test_root/private" --batch --export "$fingerprint" > "$test_root/public-key.gpg"
gpg --homedir "$test_root/public" --batch --import "$test_root/public-key.gpg" >/dev/null 2>&1
createdb "$fixture_db"
psql --no-psqlrc --dbname="$fixture_db" --set=ON_ERROR_STOP=1 --command="CREATE TABLE restore_marker(value TEXT NOT NULL); INSERT INTO restore_marker VALUES('verified-backup-marker');" >/dev/null
export BACKUP_DIRECTORY="$test_root/backups" BACKUP_GPG_HOME="$test_root/public" BACKUP_RECIPIENT="$fingerprint" BACKUP_DATABASES="$fixture_db"
# Optional MongoDB check uses only a freshly-created, isolated instance.
if [ -n "${AVIQR_SECURITY_TEST_MONGO_PORT:-}" ]; then
 [ "$AVIQR_SECURITY_TEST_MONGO_PORT" != 27017 ] || exit 1
 mkdir "$test_root/mongo"
 mongod --dbpath "$test_root/mongo" --port "$AVIQR_SECURITY_TEST_MONGO_PORT" --bind_ip 127.0.0.1 --logpath "$test_root/mongo.log" --pidfilepath "$test_root/mongo.pid" --fork >/dev/null
 mongosh "mongodb://127.0.0.1:$AVIQR_SECURITY_TEST_MONGO_PORT/$fixture_db" --quiet --eval 'db.restore_marker.insertOne({value:"verified-backup-marker"})' >/dev/null
 printf 'uri: mongodb://127.0.0.1:%s/%s\n' "$AVIQR_SECURITY_TEST_MONGO_PORT" "$fixture_db" > "$test_root/mongo-backup.yml"
 export MONGO_BACKUP_CONFIG="$test_root/mongo-backup.yml"
fi
bash "$script_dir/backup.sh"
backup_run=$(cat "$BACKUP_DIRECTORY/latest")
# Encryption with the public key must not allow decryption on the backup host.
if gpg --homedir "$test_root/public" --batch --decrypt "$backup_run/$fixture_db.dump.gpg" >/dev/null 2>&1; then echo 'Unexpected backup-host decryption access' >&2; exit 1; fi
export BACKUP_GPG_HOME="$test_root/private" RESTORE_TEST_ACK=disposable
bash "$script_dir/restore-check.sh" "$backup_run/$fixture_db.dump.gpg"
gpg --homedir "$test_root/private" --batch --decrypt "$backup_run/$fixture_db.dump.gpg" > "$test_root/restored.dump" 2>/dev/null
pg_restore --data-only --file="$test_root/restored.sql" "$test_root/restored.dump"
rg -q verified-backup-marker "$test_root/restored.sql"
if [ -n "${AVIQR_SECURITY_TEST_MONGO_PORT:-}" ]; then
 export MONGO_RESTORE_PORT="$AVIQR_SECURITY_TEST_MONGO_PORT" RESTORE_MONGO_DATABASE="$fixture_db"
 bash "$script_dir/restore-mongo-check.sh" "$backup_run/mongo.archive.gpg"
fi
# Corrupted archives fail checksum verification before touching a restore database.
printf 'corruption' >> "$backup_run/$fixture_db.dump.gpg"
if bash "$script_dir/restore-check.sh" "$backup_run/$fixture_db.dump.gpg" >/dev/null 2>&1; then echo 'Corrupted archive incorrectly accepted' >&2; exit 1; fi
printf 'Encryption, isolated restore, data marker and corruption rejection checks passed.\n'
