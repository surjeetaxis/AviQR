#!/usr/bin/env bash
set -euo pipefail
umask 077
key_dir="${1:?Usage: generate-payload-key.sh new-private-output-directory}"
if [ -e "$key_dir" ]; then echo "Output must be a new directory" >&2; exit 1; fi
mkdir -p "$key_dir"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$key_dir/payload.private.pem" 2>/dev/null
openssl pkcs8 -topk8 -nocrypt -in "$key_dir/payload.private.pem" -outform DER -out "$key_dir/payload.private.der"
{
  printf 'PAYLOAD_ENCRYPTION_PRIVATE_KEY='
  openssl base64 -A -in "$key_dir/payload.private.der"
  printf '\n'
} > "$key_dir/payload.env"
printf 'Payload key created. Install payload.env on every gateway instance; never commit the private output directory.\n'
