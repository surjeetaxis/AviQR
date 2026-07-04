#!/bin/bash
BASE=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$BASE/logs"

echo "================================================"
echo " AviQR Service Status"
echo "================================================"

SERVICES=(service-registry api-gateway auth-service shop-mall-service menu-ocr-service order-qr-service payment-service hotel-service support-service notification-report-review-service)

for svc in "${SERVICES[@]}"; do
  pid_file="$LOG_DIR/${svc}.pid"
  if [ -f "$pid_file" ]; then
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      # Check last log line for started confirmation
      started=$(grep -c "Started.*Application\|Tomcat started\|Netty started" "$LOG_DIR/${svc}.log" 2>/dev/null || echo 0)
      if [ "$started" -gt 0 ]; then
        echo "  ✅ $svc (pid $pid) — RUNNING"
      else
        echo "  ⏳ $svc (pid $pid) — STARTING..."
      fi
    else
      echo "  ❌ $svc — DEAD (pid file exists but process gone)"
    fi
  else
    echo "  ⭕ $svc — NOT STARTED"
  fi
done

echo ""
echo "Dashboard: http://localhost:8761/health"
