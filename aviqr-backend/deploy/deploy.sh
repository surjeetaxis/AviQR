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
LOCK_FILE="/var/run/aviqr-deploy.lock"
LOCK_TIMEOUT=900  # 15 min — long enough to wait out a legitimate deploy(+rollback) ahead of us

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

# Nothing serialized concurrent deploys before this: a manual `deploy.sh` run
# and the GitHub Actions auto-deploy (workflow_run after CI passes on master)
# could both git-checkout/build/restart the SAME /var/www/aviqr tree at once,
# stepping on each other's files and systemd restarts mid-flight — this is
# exactly what produced a "deploy succeeded" log line whose on-disk files
# didn't match what was actually being served, live in production. flock on
# fd 200 (held for the whole script via this open redirect, released
# automatically whenever the process exits, however it exits) means a second
# invocation blocks here instead of racing, and gives up loudly rather than
# hanging forever if the first one is somehow stuck.
exec 200>"$LOCK_FILE"
if ! flock -w "$LOCK_TIMEOUT" 200; then
  log "ERROR: could not acquire deploy lock within ${LOCK_TIMEOUT}s — another deploy.sh appears stuck. Check: ps aux | grep deploy.sh"
  exit 1
fi
log "Acquired deploy lock (pid $$)"

# A bare local branch name (e.g. "master") is a footgun here: deploy_at() does
# `git fetch` then `git checkout "$ref"`, and checking out a *local* branch
# leaves it exactly where it last was — fetch does not move it — so a stale
# local master (last touched by some earlier manual `git checkout master`)
# silently deploys old code while looking like a normal "deploy master" call.
# This bit us in production once already. `origin/<branch>` is always the
# just-fetched remote tip, so rewrite bare local branch names to it.
if git -C "$REPO_DIR" show-ref --verify --quiet "refs/heads/$TARGET_REF" 2>/dev/null; then
  log "WARNING: '$TARGET_REF' is a local branch, which can be stale — deploying origin/$TARGET_REF instead"
  TARGET_REF="origin/$TARGET_REF"
fi

# ── Build + restart everything at a given git ref ────────────────────────────
deploy_at() {
  local ref="$1"
  cd "$REPO_DIR"
  git fetch --all --tags --quiet
  git checkout --quiet "$ref"

  log "Building backend at $(git rev-parse --short HEAD)..."
  cd "$BACKEND_DIR"
  ./gradlew build -x test --no-daemon

  # service-registry can't do the blue/green switch every other service below
  # does (it IS the Eureka server — register-with-eureka=false, so it can't
  # self-verify via "2 registered instances" — see blue-green-switch.sh's
  # header). Plain restart, same as before; goes first since everything
  # else's registration checks depend on it being up.
  log "Restarting service-registry (plain restart — see blue-green-switch.sh for why)..."
  sudo systemctl restart aviqr-service-registry
  sleep 10
  if ! sudo systemctl is-active --quiet aviqr-service-registry; then
    log "systemd unit aviqr-service-registry failed to stay up after restart"
    journalctl -u aviqr-service-registry -n 40 --no-pager | tee -a "$DEPLOY_LOG"
    return 1
  fi

  # Everything else: zero-downtime blue/green switch (see blue-green-switch.sh)
  # — alternates between each service's "primary"/"alt" systemd unit, waiting
  # for the new one to be registered+healthy in Eureka before stopping the
  # old one, so there's never a moment with zero healthy instances. No fixed
  # ordering needed here (unlike the old restart loop) since a service being
  # blue/green-switched never actually goes down.
  log "Zero-downtime restarting remaining services..."
  for svc in "${SERVICES[@]}"; do
    [ "$svc" = "service-registry" ] && continue
    if ! bash "$BACKEND_DIR/deploy/blue-green-switch.sh" "$svc" 2>&1 | tee -a "$DEPLOY_LOG"; then
      log "blue-green switch failed for aviqr-${svc}"
      return 1
    fi
  done

  log "Building frontend..."
  cd "$WEB_DIR"
  npm ci --silent
  # build:prerender needs Chromium, which npm ci does NOT download on its
  # own (see scripts/prerender.mjs) — this is a no-op in well under a
  # second if it's already cached from a prior deploy, so it's cheap to run
  # every time rather than depending on someone having done the one-time
  # `--with-deps` install by hand (DEPLOYMENT.md's documented step covers
  # the OS-level shared libs that install needs sudo for; this covers just
  # the browser binary itself, so a missing browser can never silently
  # break every deploy — and every rollback attempt, since deploy_at() is
  # reused for both).
  npx playwright install chromium
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
