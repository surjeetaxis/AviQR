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

# Poll a URL until it reports healthy, instead of sleeping a fixed duration.
wait_for_url() {
  local label="$1" url="$2" timeout="${3:-60}"
  local waited=0
  while [ "$waited" -lt "$timeout" ]; do
    if curl -s "$url" 2>/dev/null | grep -q '"status":"UP"'; then
      echo "   ✓ $label ready (${waited}s)"
      return 0
    fi
    sleep 1
    waited=$((waited + 1))
  done
  echo "   ⚠ $label not confirmed ready after ${timeout}s — continuing anyway"
  return 1
}

# Poll Eureka for several services' registration concurrently (round-robin)
# instead of one-at-a-time, since they're all already starting in parallel
# in the background — waiting for them sequentially would needlessly serialize
# what's actually happening at once. Called once per batch below, so wait
# time is roughly that batch's slowest service, not the sum.
wait_for_registrations() {
  local timeout=60 waited=0
  local pending=("$@")
  while [ "${#pending[@]}" -gt 0 ] && [ "$waited" -lt "$timeout" ]; do
    local still_pending=()
    for svc in "${pending[@]}"; do
      local app_id; app_id=$(echo "$svc" | tr '[:lower:]' '[:upper:]')
      if curl -s -H "Accept: application/json" "http://localhost:8761/eureka/apps/$app_id" 2>/dev/null \
          | grep -q '"status":"UP"'; then
        echo "   ✓ $svc registered with Eureka (${waited}s)"
      else
        still_pending+=("$svc")
      fi
    done
    pending=("${still_pending[@]}")
    [ "${#pending[@]}" -gt 0 ] && sleep 1
    waited=$((waited + 1))
  done
  for svc in "${pending[@]}"; do
    echo "   ⚠ $svc not confirmed registered after ${timeout}s — continuing anyway"
  done
}

# ── 1. Service Registry — start FIRST, everything depends on it ──────────────
start_svc "service-registry"
wait_for_url "Eureka" "http://localhost:8761/actuator/health" 60

# ── 2. Everything else — no ordering dependency once Eureka is up, so start
#       them in small batches rather than one at a time. Starting all 14 at
#       once can blow past available RAM (each Spring Boot JVM needs a few
#       hundred MB while starting) and the Linux OOM killer will silently
#       kill services with no warning and no log line — tune batch size down
#       if that happens, or up if your machine has RAM to spare.
BATCH_SIZE="${AVIQR_START_BATCH_SIZE:-4}"
REST_SERVICES=(api-gateway auth-service shop-service menu-service order-service \
  payment-service qr-service hotel-service mall-service support-service \
  notification-service report-service ocr-service review-service)

total=${#REST_SERVICES[@]}
for ((i = 0; i < total; i += BATCH_SIZE)); do
  batch=("${REST_SERVICES[@]:i:BATCH_SIZE}")
  for svc in "${batch[@]}"; do
    start_svc "$svc"
  done
  wait_for_registrations "${batch[@]}"
done

echo ""
echo "================================================"
echo " All 15 services started in background"
echo "================================================"
echo ""
echo "  Watch a log:    tail -f logs/auth-service.log"
echo "  Watch all:      tail -f logs/*.log"
echo "  Stop all:       ./stop-all.sh"
echo "  Service status: ./status.sh"
