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
RELEASES_DIR="$REPO_DIR/releases"
CURRENT_LINK="$REPO_DIR/current"
KEEP_RELEASES=15  # generous: blue/green means an old release's jar can still be
                  # open in a not-yet-switched instance well after `current` moves on

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
# NOTE on error handling: this function is always called as `deploy_at ... &&
# wait_healthy` inside an `if`/`&&` — and bash's `set -e` does NOT apply inside
# the condition of an if/while/until or the left side of &&/||, for the WHOLE
# duration of whatever command sits there, including every command run inside
# a function called from there. That's not a hypothetical: a `git checkout`
# failure here (untracked file collision, real incident) was silently
# swallowed, and the rest of the function happily kept building and
# "successfully" deploying whatever the OLD checkout already was, because
# nothing after that line checked its exit code. Every step that must not be
# allowed to fail silently is therefore checked explicitly below instead of
# relying on set -e — do the same for any step added here in future.
deploy_at() {
  local ref="$1"
  cd "$REPO_DIR" || { log "cd $REPO_DIR failed"; return 1; }
  git fetch --all --tags --quiet || { log "git fetch failed"; return 1; }
  git checkout --quiet "$ref" || { log "git checkout of '$ref' failed"; return 1; }

  local checked_out want
  checked_out=$(git rev-parse HEAD)
  want=$(git rev-parse "$ref" 2>/dev/null || echo "$ref")
  if [ "$checked_out" != "$want" ]; then
    log "checkout verification failed: HEAD is $checked_out, expected $want"
    return 1
  fi

  log "Building backend at $(git rev-parse --short HEAD)..."
  cd "$BACKEND_DIR" || { log "cd $BACKEND_DIR failed"; return 1; }
  ./gradlew build -x test --no-daemon || { log "gradle build failed"; return 1; }

  # Stage every service's freshly-built jar into a release dir that's UNIQUE
  # to this deploy_at() invocation (timestamp+pid+sha, not just sha) — every
  # systemd unit's ExecStart reads from the stable $CURRENT_LINK path, not
  # from build/libs directly, specifically so that overwriting build/libs on
  # a LATER deploy_at() call (e.g. deploy fails -> automatic rollback calls
  # deploy_at() again, confirmed live) can never rewrite a jar file a
  # still-running instance already has open. Keying by sha alone isn't
  # enough: a rollback to the SAME commit as a still-live instance was built
  # from would reuse — and overwrite — that instance's exact release dir,
  # reproducing the identical corruption one layer down. A symlink repoint
  # is atomic and never touches an already-open file's bytes, however many
  # times this runs.
  local release_id release_dir
  release_id="$(date +%Y%m%d%H%M%S)-$$-$(git rev-parse --short HEAD)"
  release_dir="$RELEASES_DIR/$release_id"
  mkdir -p "$release_dir" || { log "mkdir $release_dir failed"; return 1; }
  for svc in "${SERVICES[@]}"; do
    cp "$BACKEND_DIR/${svc}/build/libs/${svc}-1.0.0.jar" "$release_dir/${svc}.jar" \
      || { log "staging release jar for $svc failed"; return 1; }
  done
  ln -sfn "$release_dir" "$CURRENT_LINK" || { log "symlinking $CURRENT_LINK -> $release_dir failed"; return 1; }
  log "Release $release_id staged, $CURRENT_LINK now points there"
  # Prune old releases (keep the most recent $KEEP_RELEASES by name, which
  # sorts chronologically since release_id starts with a timestamp) — safe
  # even if an old one is still open by a not-yet-switched instance, since
  # deleting a directory entry doesn't invalidate an already-open fd.
  ls -1dt "$RELEASES_DIR"/*/ 2>/dev/null | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf

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
  cd "$WEB_DIR" || { log "cd $WEB_DIR failed"; return 1; }
  npm ci --silent || { log "npm ci failed"; return 1; }
  # build:prerender needs Chromium, which npm ci does NOT download on its
  # own (see scripts/prerender.mjs) — this is a no-op in well under a
  # second if it's already cached from a prior deploy, so it's cheap to run
  # every time rather than depending on someone having done the one-time
  # `--with-deps` install by hand (DEPLOYMENT.md's documented step covers
  # the OS-level shared libs that install needs sudo for; this covers just
  # the browser binary itself, so a missing browser can never silently
  # break every deploy — and every rollback attempt, since deploy_at() is
  # reused for both).
  npx playwright install chromium || { log "playwright install chromium failed"; return 1; }
  VITE_API_URL="$VITE_API_URL" npm run build:prerender --silent || { log "frontend build failed"; return 1; }
  cd "$REPO_DIR" || { log "cd $REPO_DIR failed"; return 1; }
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
    # api-gateway blue/green-alternates between :8080 (primary) and :8081 (alt)
    # — see blue-green-switch.sh and nginx-aviqr.conf's aviqr_gateway upstream
    # — so exactly one of these is up at any given time, never reliably 8080.
    # Checking only 8080 meant this loop ran out its full 200s and forced a
    # needless rollback every time a deploy happened to leave gateway on
    # :8081, confirmed live in production.
    if { curl -sf http://localhost:8080/actuator/health 2>/dev/null || curl -sf http://localhost:8081/actuator/health 2>/dev/null; } | grep -q '"status":"UP"'; then
      local registered
      # grep -c always prints exactly one line (a count, possibly "0")
      # regardless of match/no-match — its exit code is what reflects that,
      # not its output. `|| echo 0` here would fire on a legitimate 0-matches
      # exit code and print a SECOND "0" line, breaking the -ge comparison
      # below with a real "integer expression expected" error.
      registered=$(curl -s http://localhost:8761/eureka/apps 2>/dev/null | grep -c '<instance>')
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
