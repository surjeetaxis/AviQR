#!/bin/bash
# AviQR — Auto-recover from a LAN IP change (Wi-Fi roam, DHCP renewal, VPN toggle)
#
# Every backend service registers with Eureka using the IP it detected at
# startup (eureka.instance.prefer-ip-address=true) and never re-detects it —
# the Eureka client only sends heartbeats renewing that same, now-stale,
# registration. If this machine's LAN IP changes while the stack is running,
# every gateway-routed request starts failing with a raw 500 (curl straight to
# the gateway on localhost still works; only calls the gateway proxies to a
# downstream service break), and the only fix is a full stack restart so every
# service re-registers with the new IP.
#
# This script is that fix, automated: it polls the machine's LAN IP and runs
# stop-all.sh + start-all.sh the moment it changes, instead of a human having
# to notice the 500s and diagnose it (see AVIQR_MOBILE_PMS_PORT_GUIDE.md in
# the aviqr files/ folder for how this was originally found and diagnosed by
# hand).
#
# Usage:
#   nohup ./watch-ip.sh > logs/watch-ip-stdout.log 2>&1 &
#   echo $! > logs/watch-ip.pid
#   # ... later ...
#   kill $(cat logs/watch-ip.pid)
#
# Env vars:
#   WATCH_IP_INTERVAL_SECONDS — how often to check (default 30)
#   WATCH_IP_INTERFACE        — network interface to read (default en0)

BASE=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

INTERVAL="${WATCH_IP_INTERVAL_SECONDS:-30}"
IFACE="${WATCH_IP_INTERFACE:-en0}"
STATE_FILE="$LOG_DIR/.last-ip"
LOG_FILE="$LOG_DIR/watch-ip.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

current_ip() {
  ipconfig getifaddr "$IFACE" 2>/dev/null
}

log "watch-ip started — polling '$IFACE' every ${INTERVAL}s"

last_ip=""
if [ -f "$STATE_FILE" ]; then
  last_ip=$(cat "$STATE_FILE")
fi

if [ -z "$last_ip" ]; then
  last_ip=$(current_ip)
  echo "$last_ip" > "$STATE_FILE"
  log "no prior recorded IP — baselining at $last_ip (no restart)"
fi

while true; do
  sleep "$INTERVAL"
  ip=$(current_ip)

  if [ -z "$ip" ]; then
    log "⚠ could not read an IP for interface '$IFACE' — skipping this check"
    continue
  fi

  if [ "$ip" != "$last_ip" ]; then
    log "LAN IP changed: $last_ip → $ip — restarting the backend stack"
    echo "$ip" > "$STATE_FILE"
    last_ip="$ip"
    "$BASE/stop-all.sh" >> "$LOG_FILE" 2>&1
    "$BASE/start-all.sh" >> "$LOG_FILE" 2>&1
    log "restart triggered — see start-all.sh's own per-service logs in $LOG_DIR/*.log for status"
  fi
done
