#!/usr/bin/env bash
# Runs as root before backup.sh (aviqr-backup.service ExecStartPre=+): encrypts the files needed to
# rebuild the server's services (service secrets and keys, shared .env, systemd units, nginx site) to the
# backup public key and hands the archive to the unprivileged backup user.
set -euo pipefail
umask 077
: "${BACKUP_DIRECTORY:?}" "${BACKUP_GPG_HOME:?}" "${BACKUP_RECIPIENT:?}"
paths=(etc/aviqr var/www/aviqr/aviqr-backend/.env etc/nginx/sites-available/aviqr)
for unit in /etc/systemd/system/aviqr-*; do paths+=("${unit#/}"); done
existing=(); for p in "${paths[@]}"; do [ -e "/$p" ] && existing+=("$p"); done
staging="$BACKUP_DIRECTORY/.staging"
install -d -m 700 -o aviqr-backup -g aviqr-backup "$staging"
# A throwaway keyring holding only the public key, so root never touches the backup user's GPG home.
gnupg=$(mktemp -d); trap 'rm -rf "$gnupg"' EXIT
gpg --homedir "$BACKUP_GPG_HOME" --batch --quiet --export "$BACKUP_RECIPIENT" 2>/dev/null | gpg --homedir "$gnupg" --batch --quiet --import
tar -C / -cf - "${existing[@]}" | gpg --homedir "$gnupg" --batch --yes --trust-model always \
 --recipient "$BACKUP_RECIPIENT" --encrypt --output "$staging/server-config.tar.gpg"
chown aviqr-backup:aviqr-backup "$staging/server-config.tar.gpg"
