#!/bin/bash
BASE=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$BASE/logs"

echo "Stopping all AviQR services..."

SERVICES=(service-registry api-gateway auth-service shop-service menu-service order-service payment-service qr-service hotel-service mall-service support-service notification-service report-service ocr-service review-service)

for svc in "${SERVICES[@]}"; do
  pid_file="$LOG_DIR/${svc}.pid"
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && echo "  ✓ Stopped $svc (pid $pid)"
    else
      echo "  - $svc already stopped"
    fi
    rm -f "$pid_file"
  fi
done

# Also kill any stragglers by name. Matching on "aviqr-backend" alone would
# also match this very script's own invocation path (it lives under
# aviqr-backend/) and kill itself before it finishes — match the running
# app JVMs' classpath instead, which is specific to them.
pkill -f "build/classes/java/main" 2>/dev/null || true

# Free the critical ports in case something is still holding them
fuser -k 8761/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true

echo ""
echo "All services stopped."
