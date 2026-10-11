#!/usr/bin/env bash
# Encrypted AviQR backups: every database (and MongoDB) is dumped and encrypted to the backup
# public key, so this server can write backups but never read them. Runs as aviqr-backup via
# aviqr-backup.service; backup-config.sh (run first, as root) adds the server's secrets and config.
set -euo pipefail
umask 077
: "${BACKUP_DIRECTORY:?Set private backup output directory}"
: "${BACKUP_GPG_HOME:?Set GPG directory containing the backup public key}"
: "${BACKUP_RECIPIENT:?Set exact backup recipient fingerprint}"
: "${BACKUP_DATABASES:?Set space-separated database names}"
command -v pg_dump >/dev/null
command -v gpg >/dev/null
encrypt() { gpg --homedir "$BACKUP_GPG_HOME" --batch --yes --trust-model always --recipient "$BACKUP_RECIPIENT" --encrypt --output "$1"; }
mkdir -p "$BACKUP_DIRECTORY"
run_name="$(date -u +%Y%m%dT%H%M%SZ)-$$"
backup_run="$BACKUP_DIRECTORY/$run_name"
mkdir "$backup_run"
for db in $BACKUP_DATABASES; do
 [[ "$db" =~ ^[a-zA-Z0-9_]+$ ]] || { echo 'Invalid database name' >&2; exit 1; }
 pg_dump --format=custom --no-owner --no-privileges --dbname="$db" | encrypt "$backup_run/$db.dump.gpg"
done
if [ -n "${MONGO_BACKUP_CONFIG:-}" ]; then
 mongodump --quiet --config "$MONGO_BACKUP_CONFIG" --archive | encrypt "$backup_run/mongo.archive.gpg"
fi
# Server secrets and config, encrypted by backup-config.sh before this script runs.
staged="$BACKUP_DIRECTORY/.staging/server-config.tar.gpg"
if [ -f "$staged" ]; then mv "$staged" "$backup_run/server-config.tar.gpg"
elif [ "${BACKUP_CONFIG_REQUIRED:-false}" = true ]; then echo 'Server config archive is missing' >&2; exit 1; fi
(cd "$backup_run" && sha256sum ./*.gpg > SHA256SUMS)
offsite=false
if [ -n "${BACKUP_S3_URI:-}" ]; then
 [[ "$BACKUP_S3_URI" = s3://* ]] || { echo 'Invalid offsite bucket URI' >&2; exit 1; }
 aws s3 cp "$backup_run" "${BACKUP_S3_URI%/}/$run_name/" --recursive --only-show-errors --sse aws:kms
 offsite=true
fi
if [ -n "${BACKUP_SFTP_TARGET:-}" ]; then
 # e.g. u123456@u123456.your-storagebox.de; port 23, key auth, pinned host key.
 : "${BACKUP_SSH_KEY:?Set the private key for the SFTP target}"
 : "${BACKUP_SSH_KNOWN_HOSTS:?Set the known_hosts file pinning the SFTP host key}"
 remote_dir="${BACKUP_SFTP_DIR:-aviqr-backups}"
 sftp_cmd=(sftp -q -b - -P "${BACKUP_SFTP_PORT:-23}" -i "$BACKUP_SSH_KEY" -o IdentitiesOnly=yes -o BatchMode=yes
  -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$BACKUP_SSH_KNOWN_HOSTS" "$BACKUP_SFTP_TARGET")
 printf -- '-mkdir %s\nmkdir %s/%s\nput %s/* %s/%s/\n' "$remote_dir" "$remote_dir" "$run_name" "$backup_run" "$remote_dir" "$run_name" | "${sftp_cmd[@]}"
 # Keep the newest BACKUP_KEEP_REMOTE runs on the target (names sort by time).
 keep_remote="${BACKUP_KEEP_REMOTE:-30}"
 old=$(printf 'ls -1 %s\n' "$remote_dir" | "${sftp_cmd[@]}" 2>/dev/null | grep -E '/[0-9]{8}T[0-9]{6}Z-[0-9]+$' | sort | head -n -"$keep_remote" || true)
 for dir in $old; do printf -- '-rm %s/*\n-rmdir %s\n' "$dir" "$dir"; done | { [ -n "$old" ] && "${sftp_cmd[@]}" || true; }
 offsite=true
fi
if [ "$offsite" != true ] && [ "${BACKUP_OFFSITE_REQUIRED:-false}" = true ]; then
 echo 'Offsite backup destination is required' >&2; exit 1
fi
printf '%s\n' "$backup_run" > "$BACKUP_DIRECTORY/latest"
# Keep the newest BACKUP_KEEP_LOCAL runs here.
ls -1d "$BACKUP_DIRECTORY"/[0-9]*T*Z-* 2>/dev/null | sort | head -n -"${BACKUP_KEEP_LOCAL:-14}" | xargs -r rm -rf
printf 'Encrypted backup %s completed%s.\n' "$run_name" "$([ "$offsite" = true ] && echo ' and copied off-host' || echo ' (local only)')"
