#!/usr/bin/env bash
set -euo pipefail
umask 077
key_dir="${1:?Usage: generate-service-keys.sh private-output-directory}"
if [ -e "$key_dir" ]; then echo "Output must be a new directory" >&2; exit 1; fi
mkdir -p "$key_dir"
for svc in api-gateway auth-service shop-mall-service menu-ocr-service order-qr-service payment-service hotel-service support-service notification-report-review-service pms-service; do
 openssl genpkey -algorithm ED25519 -out "$key_dir/$svc.private.pem" 2>/dev/null
 openssl pkey -in "$key_dir/$svc.private.pem" -outform DER | openssl base64 -A > "$key_dir/$svc.private.base64"
 openssl pkey -in "$key_dir/$svc.private.pem" -pubout -outform DER | openssl base64 -A > "$key_dir/$svc.public.base64"
done
python3 - "$key_dir" <<'KEYS'
import json,sys
from pathlib import Path
p=Path(sys.argv[1]);(p/'public-keys.json').write_text(json.dumps({f.name.removesuffix('.public.base64')+'.v1':f.read_text().strip() for f in p.glob('*.public.base64')}))
KEYS
printf 'Keys created in the private output directory. Install only each service own private key. Never commit these files.\n'
