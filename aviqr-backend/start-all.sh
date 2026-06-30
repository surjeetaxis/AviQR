#!/bin/bash
# AviQR — Start all services without Docker
# Usage: ./start-all.sh
# Logs:  tail -f logs/<service-name>.log

BASE=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

echo "================================================"
echo " AviQR Backend — Starting all services"
echo " Logs: $LOG_DIR/"
echo "================================================"
echo ""

start_svc() {
  local name=$1
  echo "→ Starting $name..."
  # --no-daemon: prevents 13 daemon JVMs accumulating in memory
  SPRING_PROFILES_ACTIVE=local "$BASE/gradlew" "${name}:bootRun" \
    --no-daemon \
    > "$LOG_DIR/${name}.log" 2>&1 &
  echo $! > "$LOG_DIR/${name}.pid"
}

# ── 1. Service Registry — start FIRST, everything depends on it ──────────────
start_svc "service-registry"
echo "   Waiting 25s for Eureka to be ready..."
sleep 25

# Verify Eureka is actually up before continuing
if curl -s http://localhost:8761/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
  echo "   ✓ Eureka is up"
else
  echo "   ⚠ Eureka may still be starting — continuing anyway"
fi

# ── 2. API Gateway ───────────────────────────────────────────────────────────
start_svc "api-gateway"
echo "   Waiting 15s for Gateway..."
sleep 15

# ── 3. Auth Service (critical path — most other services depend on it) ────────
start_svc "auth-service"
sleep 8

# ── 4. Shop & Menu (needed early for order flow) ─────────────────────────────
start_svc "shop-service"
sleep 6
start_svc "menu-service"
sleep 6

# ── 5. Order, Payment, QR ────────────────────────────────────────────────────
start_svc "order-service"
sleep 6
start_svc "payment-service"
sleep 5
start_svc "qr-service"
sleep 5

# ── 6. Hotel, Mall ────────────────────────────────────────────────────────────
start_svc "hotel-service"
sleep 5
start_svc "mall-service"
sleep 5

# ── 7. Support, Notification, Report, OCR ────────────────────────────────────
start_svc "support-service"
sleep 5
start_svc "notification-service"
sleep 5
start_svc "report-service"
sleep 5
start_svc "ocr-service"
sleep 3

# ── 8. Review Service ─────────────────────────────────────────────────────────
start_svc "review-service"
sleep 5

echo ""
echo "================================================"
echo " All 15 services started in background"
echo "================================================"
echo ""
echo "  Wait 60s then open:  http://localhost:8761/health"
echo ""
echo "  Watch a log:    tail -f logs/auth-service.log"
echo "  Watch all:      tail -f logs/*.log"
echo "  Stop all:       ./stop-all.sh"
echo "  Service status: ./status.sh"
