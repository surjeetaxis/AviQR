#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${BACKUP_DIRECTORY:?Set private backup output directory}"
: "${BACKUP_GPG_HOME:?Set GPG directory containing the backup public key}"
: "${BACKUP_RECIPIENT:?Set exact backup recipient fingerprint}"
: "${BACKUP_DATABASES:?Set space-separated database names}"
command -v pg_dump >/dev/null
command -v gpg >/dev/null
mkdir -p "$BACKUP_DIRECTORY"
backup_run="$BACKUP_DIRECTORY/$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir "$backup_run"
for db in $BACKUP_DATABASES; do
 [[ "$db" =~ ^[a-zA-Z0-9_]+$ ]] || { echo 'Invalid database name' >&2; exit 1; }
 pg_dump --format=custom --no-owner --no-privileges --dbname="$db" | gpg --homedir "$BACKUP_GPG_HOME" --batch --yes --trust-model always --recipient "$BACKUP_RECIPIENT" --encrypt --output "$backup_run/$db.dump.gpg"
done
if [ -n "${MONGO_BACKUP_CONFIG:-}" ]; then
 mongodump --config "$MONGO_BACKUP_CONFIG" --archive | gpg --homedir "$BACKUP_GPG_HOME" --batch --yes --trust-model always --recipient "$BACKUP_RECIPIENT" --encrypt --output "$backup_run/mongo.archive.gpg"
fi
(cd "$backup_run" && shasum -a 256 ./*.gpg > SHA256SUMS)
if [ -n "${BACKUP_S3_URI:-}" ]; then
 [[ "$BACKUP_S3_URI" = s3://* ]] || { echo 'Invalid offsite bucket URI' >&2; exit 1; }
 aws s3 cp "$backup_run" "${BACKUP_S3_URI%/}/$(basename "$backup_run")/" --recursive --only-show-errors --sse aws:kms
elif [ "${BACKUP_OFFSITE_REQUIRED:-false}" = true ]; then
 echo 'Offsite backup destination is required' >&2; exit 1
fi
printf '%s\n' "$backup_run" > "$BACKUP_DIRECTORY/latest"
printf 'Encrypted backup completed. Copy it to access-controlled off-host storage.\n'
