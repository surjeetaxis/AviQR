#!/bin/bash
# ==============================================================================
#  deploy.sh — runs ON the production server (invoked over SSH by the
#  deploy-production GitHub Actions workflow, or by hand for a manual redeploy).
#
#  Automates the exact runbook in ../DEPLOYMENT_NO_DOCKER.md "Redeploy after
#  code change" / "PROD STEP 7-10", plus health verification and automatic
#  rollback if the new deploy doesn't come up healthy.
#
#  Usage: deploy.sh <git-ref-to-deploy>   (a commit SHA or branch/tag name)
#
#  Assumes (see ../DEPLOYMENT_NO_DOCKER.md for the one-time server setup):
#    - /var/www/aviqr is a git clone of this repo, on the deploy user's PATH
#      for git/java/node/gradle
#    - systemd services aviqr-<service> already exist for every entry in
#      SERVICES below (created once via PROD STEP 8)
#    - the deploy user can run `systemctl restart/status/is-active aviqr-*`
#      without a password (see the sudoers snippet in DEPLOYMENT_NO_DOCKER.md)
#    - Nginx already serves aviqr-ui-web/dist as a static root (PROD STEP 11)
# ==============================================================================

set -euo pipefail

REPO_DIR="${AVIQR_REPO_DIR:-/var/www/aviqr}"
BACKEND_DIR="$REPO_DIR/aviqr-backend"
WEB_DIR="$REPO_DIR/aviqr-ui-web"
VITE_API_URL="${VITE_API_URL:-https://api.aviqr.com}"
DEPLOY_LOG="/var/log/aviqr-deploy.log"

# Order matters: registry and gateway must be up before anything that
# registers with Eureka or routes through the gateway. Mirrors aviqr.sh's
# SERVICES array and cmd_run "all" ordering.
SERVICES=(
  service-registry api-gateway auth-service shop-mall-service menu-ocr-service
  order-qr-service payment-service hotel-service
  support-service notification-report-review-service
)

TARGET_REF="${1:?Usage: deploy.sh <git-sha-or-ref>}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$DEPLOY_LOG"; }

# ── Build + restart everything at a given git ref ────────────────────────────
deploy_at() {
  local ref="$1"
  cd "$REPO_DIR"
  git fetch --all --tags --quiet
  git checkout --quiet "$ref"

  log "Building backend at $(git rev-parse --short HEAD)..."
  cd "$BACKEND_DIR"
  ./gradlew build -x test --no-daemon

  log "Restarting backend services in dependency order..."
  for svc in "${SERVICES[@]}"; do
    sudo systemctl restart "aviqr-${svc}"
    case "$svc" in
      service-registry|api-gateway) sleep 10 ;;
      *) sleep 4 ;;
    esac
    if ! sudo systemctl is-active --quiet "aviqr-${svc}"; then
      log "systemd unit aviqr-${svc} failed to stay up after restart"
      journalctl -u "aviqr-${svc}" -n 40 --no-pager | tee -a "$DEPLOY_LOG"
      return 1
    fi
  done

  log "Building frontend..."
  cd "$WEB_DIR"
  npm ci --silent
  VITE_API_URL="$VITE_API_URL" npm run build:prerender --silent
  cd "$REPO_DIR"
}

# ── Wait for the gateway + all services to report healthy via Eureka ─────────
wait_healthy() {
  # service-registry IS the Eureka server (eureka.client.register-with-eureka=false in its
  # application.properties) so it never appears as a registered <instance> itself — the other
  # 9 services are all that /eureka/apps can ever report. Using len(SERVICES)==10 here means
  # this can never succeed, silently forcing every deploy into a "failed health check" rollback
  # regardless of whether the new code is actually healthy.
  local expected=$((${#SERVICES[@]} - 1))
  for i in $(seq 1 40); do
    if curl -sf http://localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
      local registered
      registered=$(curl -s http://localhost:8761/eureka/apps 2>/dev/null | grep -c '<instance>' || echo 0)
      if [ "$registered" -ge "$expected" ]; then
        return 0
      fi
    fi
    sleep 5
  done
  return 1
}

# ── Main ──────────────────────────────────────────────────────────────────────
cd "$REPO_DIR"
PREVIOUS_SHA=$(git rev-parse HEAD)
log "Starting deploy of '$TARGET_REF' (current HEAD $PREVIOUS_SHA, kept for rollback)"

if deploy_at "$TARGET_REF" && wait_healthy; then
  log "Deploy successful — $(git rev-parse --short HEAD) is live, all ${#SERVICES[@]} services healthy in Eureka."
  exit 0
fi

log "Deploy of '$TARGET_REF' FAILED health check — rolling back to $PREVIOUS_SHA"
if deploy_at "$PREVIOUS_SHA" && wait_healthy; then
  log "Rollback to $PREVIOUS_SHA successful. Original deploy of '$TARGET_REF' did NOT go live."
else
  log "ROLLBACK ALSO FAILED. Manual intervention required — check: journalctl -u 'aviqr-*' -n 100"
fi
exit 1
