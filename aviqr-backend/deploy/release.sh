#!/bin/bash
# ==============================================================================
#  release.sh — runs ON a target server (staging or production) via SSH from
#  the Jenkins pipeline. Extracts a pre-built release tarball (produced by
#  package-release.sh — same backend jars used for every environment, only the
#  web bundle differs) and atomically switches `current` to it, then restarts
#  services in dependency order.
#
#  Rollback on a failed health check is just re-pointing the `current` symlink
#  to the previous release and restarting — no rebuild, so it's seconds, not
#  the minutes deploy.sh's rebuild-based rollback took.
#
#  Usage: release.sh <staging|production> <release-id> <path-to-tarball>
#
#  One-time server prerequisites (see JENKINS_PIPELINE.md):
#    - /var/www/aviqr/releases/ exists and /var/www/aviqr/current is a symlink
#    - every aviqr-<svc> systemd unit's ExecStart points at
#      /var/www/aviqr/current/backend/<svc>.jar (not the git checkout path)
#    - Nginx web root points at /var/www/aviqr/current/web/dist-current
#    - this server's .env / systemd units already set
#      SPRING_PROFILES_ACTIVE=<staging|production> for this environment
# ==============================================================================
set -euo pipefail

ENVIRONMENT="${1:?Usage: release.sh <staging|production> <release-id> <tarball-path>}"
RELEASE_ID="${2:?missing release id}"
TARBALL="${3:?missing tarball path}"

case "$ENVIRONMENT" in
  staging|production) ;;
  *) echo "ERROR: environment must be 'staging' or 'production', got '$ENVIRONMENT'" >&2; exit 1 ;;
esac

REPO_DIR="${AVIQR_REPO_DIR:-/var/www/aviqr}"
RELEASES_DIR="$REPO_DIR/releases"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
CURRENT_LINK="$REPO_DIR/current"
DEPLOY_LOG="/var/log/aviqr-deploy.log"
KEEP_RELEASES=5

# Mirrors deploy.sh's SERVICES array — keep both in sync.
SERVICES=(
  service-registry api-gateway auth-service shop-mall-service menu-ocr-service
  order-qr-service payment-service hotel-service
  support-service notification-report-review-service
)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$ENVIRONMENT] $*" | tee -a "$DEPLOY_LOG"; }

restart_all() {
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
}

wait_healthy() {
  local expected=${#SERVICES[@]}
  for i in $(seq 1 40); do
    if curl -sf http://localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
      local registered
      registered=$(curl -s http://localhost:8761/eureka/apps 2>/dev/null | grep -c '<instance>' || echo 0)
      [ "$registered" -ge "$expected" ] && return 0
    fi
    sleep 5
  done
  return 1
}

switch_to() {
  local target_release="$1"
  ln -sfn "$RELEASES_DIR/$target_release" "$CURRENT_LINK"
  restart_all && wait_healthy
}

mkdir -p "$RELEASES_DIR"
PREVIOUS_RELEASE=""
if [ -L "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE=$(basename "$(readlink "$CURRENT_LINK")")
fi

log "Extracting release $RELEASE_ID from $TARBALL"
rm -rf "$RELEASE_DIR"
tar -xzf "$TARBALL" -C "$RELEASES_DIR"
# Stable name inside the release so Nginx/systemd never need an environment-
# specific path — dist-current resolves to dist-staging or dist-production
# depending on which box this script is running on.
ln -sfn "$RELEASE_DIR/web/dist-${ENVIRONMENT}" "$RELEASE_DIR/web/dist-current"

log "Switching current -> $RELEASE_ID (previous: ${PREVIOUS_RELEASE:-none})"
if switch_to "$RELEASE_ID"; then
  sudo systemctl reload nginx
  log "Deploy of $RELEASE_ID successful — all ${#SERVICES[@]} services healthy."
  ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
  rm -f "$TARBALL"
  exit 0
fi

log "Deploy of $RELEASE_ID FAILED health check."
if [ -n "$PREVIOUS_RELEASE" ]; then
  log "Rolling back to $PREVIOUS_RELEASE"
  if switch_to "$PREVIOUS_RELEASE"; then
    sudo systemctl reload nginx
    log "Rollback to $PREVIOUS_RELEASE successful. $RELEASE_ID did NOT go live."
  else
    log "ROLLBACK ALSO FAILED. Manual intervention required — check: journalctl -u 'aviqr-*' -n 100"
  fi
else
  log "No previous release to roll back to — manual intervention required."
fi
exit 1
