#!/bin/bash
# ==============================================================================
#  blue-green-switch.sh — runs ON the production server, called once per
#  service from deploy.sh's deploy_at(). Achieves zero-downtime restarts for
#  services that already register dynamically with Eureka (server.port=0,
#  eureka.instance.instance-id includes ${random.value} — see each service's
#  application.properties) by alternating between two systemd unit variants
#  ("primary": aviqr-<svc>.service, "alt": aviqr-<svc>-alt.service):
#
#    1. Start whichever variant is currently INACTIVE (already has the newly
#       built jar, since both units point at the same jar path).
#    2. Poll Eureka until BOTH the old and new instance are registered under
#       the same app name — at that moment the gateway is already
#       load-balancing across both, so there is no instant with zero healthy
#       instances of this service.
#    3. Stop the OLD variant. Traffic that was mid-flight to it either
#       completed already or gets retried by the caller/gateway against the
#       instance that's still up.
#    4. Record which variant is now active in $STATE_DIR/<svc>, so the next
#       call knows which one is inactive.
#
#  api-gateway needs no special-casing here even though its port is fixed
#  (0 for the rest, 8080/8081 for gateway via -Dserver.port on the alt
#  unit) — it registers with Eureka like every other service, so the same
#  "wait for 2 registered instances" check works unchanged. What makes it
#  actually zero-downtime is external to this script: the aviqr_gateway
#  Nginx upstream (see nginx-aviqr.conf) load-balances 8080+8081 with
#  automatic failover, so Nginx itself never routes to the port that's
#  mid-restart.
#
#  service-registry is deliberately NOT covered by this script — it IS the
#  Eureka server (register-with-eureka=false in its own config), so it can't
#  self-verify via "2 registered instances", and running two unclustered
#  Eureka servers on one box is its own can of worms. It stays on the plain
#  systemctl-restart path in deploy.sh; its code changes rarely, and Eureka
#  clients cache the registry locally, which cushions its brief restart.
#
#  Usage: blue-green-switch.sh <service-name>   (e.g. auth-service)
# ==============================================================================
set -euo pipefail

SVC="${1:?Usage: blue-green-switch.sh <service-name>}"
STATE_DIR="${AVIQR_DEPLOY_STATE_DIR:-/var/www/aviqr/deploy-state}"
STATE_FILE="$STATE_DIR/$SVC"
EUREKA_APP=$(echo "$SVC" | tr '[:lower:]' '[:upper:]')
REGISTER_TIMEOUT_TRIES=30   # 30 * 3s = 90s for the new instance to register+lease

mkdir -p "$STATE_DIR"

active=$(cat "$STATE_FILE" 2>/dev/null || echo primary)
if [ "$active" = "primary" ]; then
  inactive_unit="aviqr-${SVC}-alt"
  active_unit="aviqr-${SVC}"
  new_state="alt"
else
  inactive_unit="aviqr-${SVC}"
  active_unit="aviqr-${SVC}-alt"
  new_state="primary"
fi

echo "[blue-green] $SVC: active=$active_unit starting=$inactive_unit"
sudo systemctl start "$inactive_unit"

registered=0
for i in $(seq 1 "$REGISTER_TIMEOUT_TRIES"); do
  # grep -c always prints exactly one line (a count, possibly "0") regardless of
  # whether it matched anything — its exit code is what reflects match/no-match.
  # `|| echo 0` here would fire on that legitimate 0-matches exit code and print
  # a SECOND "0" line, making $count "0\n0" and breaking the -ge comparison
  # below with a real "integer expression expected" error — confirmed live.
  #
  # That fix wasn't enough on its own, though: this script also runs under
  # set -euo pipefail, and grep -c exits 1 on zero matches — completely
  # normal here on an early iteration, since the new instance hasn't
  # registered yet. Under pipefail that 1 propagates to this plain
  # `count=$(...)` assignment, and set -e treats the assignment itself as a
  # failed command, killing the whole script on the very first loop
  # iteration — before it ever gets to sleep 3, let alone the 90s timeout.
  # Confirmed live: two consecutive deploys (a real one, then its
  # automatic rollback) both died here in under a second, while the
  # service they were "failing" to start had actually started fine and
  # was healthy seconds later. `|| true` neutralizes the pipeline's exit
  # status without touching what grep already wrote to $count.
  count=$(curl -s "http://localhost:8761/eureka/apps/${EUREKA_APP}" 2>/dev/null | grep -c '<instance>' || true)
  if [ "$count" -ge 2 ]; then registered=1; break; fi
  sleep 3
done

if [ "$registered" -ne 1 ]; then
  echo "[blue-green] $SVC: new instance ($inactive_unit) never reached 2 registered Eureka instances — aborting this service, stopping it, leaving $active_unit as-is"
  sudo systemctl stop "$inactive_unit" || true
  exit 1
fi

echo "[blue-green] $SVC: $inactive_unit healthy alongside $active_unit — stopping old ($active_unit)"
sudo systemctl stop "$active_unit"

echo -n "$new_state" > "$STATE_FILE"
echo "[blue-green] $SVC: switched active -> $new_state ($inactive_unit)"
