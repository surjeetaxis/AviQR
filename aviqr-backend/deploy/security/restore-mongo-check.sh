#!/usr/bin/env bash
set -euo pipefail
umask 077
[ "${RESTORE_TEST_ACK:-}" = disposable ] || { echo 'Set RESTORE_TEST_ACK=disposable' >&2; exit 1; }
: "${MONGO_RESTORE_PORT:?Set isolated loopback MongoDB port}"
[ "$MONGO_RESTORE_PORT" != 27017 ] || { echo 'Do not use the ordinary MongoDB port' >&2; exit 1; }
: "${RESTORE_MONGO_DATABASE:?Select an application database from the archive}"
[[ "$RESTORE_MONGO_DATABASE" =~ ^[a-zA-Z0-9_]+$ ]] || exit 1
: "${BACKUP_GPG_HOME:?Set private restore GPG directory}"
archive="${1:?Usage: restore-mongo-check.sh encrypted-mongo-archive}"
archive_directory=$(cd "$(dirname "$archive")" && pwd)
(cd "$archive_directory" && shasum -a 256 -c SHA256SUMS)
raw_dump=$(mktemp)
restore_db="aviqr_restore_test_$(date +%s)_$$"
uri="mongodb://127.0.0.1:$MONGO_RESTORE_PORT"
cleanup(){ mongosh "$uri/$restore_db" --quiet --eval 'db.dropDatabase()' >/dev/null 2>&1 || true; rm -f "$raw_dump"; }
trap cleanup EXIT
gpg --homedir "$BACKUP_GPG_HOME" --batch --yes --decrypt --output "$raw_dump" "$archive"
mongorestore --uri "$uri" --archive="$raw_dump" --stopOnError --nsInclude="$RESTORE_MONGO_DATABASE.*" --nsFrom="$RESTORE_MONGO_DATABASE.*" --nsTo="$restore_db.*"
mongosh "$uri/$restore_db" --quiet --eval 'const names=db.getCollectionNames(); if(names.length===0)throw Error("No application collections restored"); for(const name of names){const result=db.runCommand({validate:name,full:true}); if(!result.valid)throw Error("Invalid restored collection");} print("Disposable MongoDB restore verification passed");'
