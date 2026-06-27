#!/bin/bash
# ==============================================================================
#  aviqr-mobile.sh — single entry point for the AviQR mobile app (Expo)
#
#  Usage:
#    ./aviqr-mobile.sh help                       Show this help
#    ./aviqr-mobile.sh install                    npm install
#    ./aviqr-mobile.sh bundle                     Sanity-check the JS bundle (expo export, web)
#    ./aviqr-mobile.sh start [--bg]                Start Expo dev server / Metro bundler
#    ./aviqr-mobile.sh stop                        Stop the background dev server
#    ./aviqr-mobile.sh status                      Show dev server running/stopped state
#    ./aviqr-mobile.sh logs [-f]                   Show (or follow) the dev server log
#    ./aviqr-mobile.sh deploy <android|ios|all> [--profile <profile>]
#                                                   Cloud native build via `eas build`
#    ./aviqr-mobile.sh submit <android|ios>         Submit the latest build via `eas submit`
#    ./aviqr-mobile.sh update [--branch <branch>] [--message <msg>]
#                                                   Push an OTA JS update via `eas update`
#
#  Run with no arguments for the same as `help`.
# ==============================================================================

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

DEV_PID="$LOG_DIR/expo.pid"
DEV_LOG="$LOG_DIR/expo.log"

# ── Output helpers ────────────────────────────────────────────────────────────
ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
err()  { echo "  ❌ $*"; }

is_running() {
  [ -f "$DEV_PID" ] && kill -0 "$(cat "$DEV_PID")" 2>/dev/null
}

# ==============================================================================
#  help
# ==============================================================================
cmd_help() {
  cat <<'EOF'
================================================================================
 AviQR Mobile — React Native + Expo Router app
================================================================================

Description:
  Role-based mobile app (customer ordering + owner/admin/hotel/mall/supplier/
  support apps, one codebase routed by role). Talks to the backend only
  through the API Gateway. This script is local-dev + cloud-build only; it
  does not touch the backend or web dashboard — see ../aviqr.sh for those.

Usage:
  ./aviqr-mobile.sh help                       Show this help
  ./aviqr-mobile.sh install                    npm install
  ./aviqr-mobile.sh bundle                     Sanity-check the JS bundle (expo export, web)
  ./aviqr-mobile.sh start [--bg]                Start Expo dev server / Metro bundler
  ./aviqr-mobile.sh stop                        Stop the background dev server
  ./aviqr-mobile.sh status                      Show dev server running/stopped state
  ./aviqr-mobile.sh logs [-f]                   Show (or follow) the dev server log
  ./aviqr-mobile.sh deploy <android|ios|all> [--profile <profile>]
                                                 Cloud native build via `eas build`
  ./aviqr-mobile.sh submit <android|ios>         Submit the latest build via `eas submit`
  ./aviqr-mobile.sh update [--branch <branch>] [--message <msg>]
                                                 Push an OTA JS update via `eas update`

Examples:
  ./aviqr-mobile.sh start                       # foreground, scan QR with Expo Go or press w/a/i
  ./aviqr-mobile.sh start --bg && ./aviqr-mobile.sh logs -f
  ./aviqr-mobile.sh deploy android --profile preview
  ./aviqr-mobile.sh deploy all --profile production
  ./aviqr-mobile.sh submit android
  ./aviqr-mobile.sh update --branch production --message "fix order screen crash"

Notes:
  - `deploy`/`submit`/`update` run via `npx eas-cli` (no global install needed)
    and require `eas login` once, plus a configured `eas.json` (run
    `npx eas-cli build:configure` the first time to generate one).
  - Native builds happen on Expo's cloud infrastructure, not locally.
EOF
}

# ==============================================================================
#  install / bundle
# ==============================================================================
cmd_install() {
  echo "→ npm install..."
  (cd "$BASE" && npm install)
}

cmd_bundle() {
  # Verifies the JS bundle resolves; does not produce a native APK/IPA.
  echo "→ Checking mobile bundle (expo export, web target)..."
  (cd "$BASE" && npm install --silent && npx expo export --platform web --output-dir /tmp/aviqr-mobile-export)
}

# ==============================================================================
#  start / stop / status / logs (local dev server)
# ==============================================================================
cmd_start() {
  if [ "${1:-}" = "--bg" ]; then
    if is_running; then
      warn "Dev server already running (pid $(cat "$DEV_PID"))"
      return 0
    fi
    echo "→ Starting Expo dev server in background..."
    (cd "$BASE" && CI=1 nohup npx expo start > "$DEV_LOG" 2>&1 &
     echo $! > "$DEV_PID")
    ok "Started — log: $DEV_LOG"
  else
    echo "→ Starting Expo dev server in foreground (Ctrl+C to stop). Use --bg to background it."
    (cd "$BASE" && npx expo start)
  fi
}

cmd_stop() {
  if [ -f "$DEV_PID" ]; then
    local pid
    pid=$(cat "$DEV_PID")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && ok "Stopped dev server (pid $pid)"
    else
      warn "Dev server already stopped"
    fi
    rm -f "$DEV_PID"
  else
    warn "Dev server was not started by this script (no pid file)"
  fi
  pkill -f "expo start" 2>/dev/null || true
  fuser -k 8081/tcp >/dev/null 2>&1 || true
}

cmd_status() {
  if is_running; then
    echo "  ✅ Expo dev server (pid $(cat "$DEV_PID")) — RUNNING"
  elif [ -f "$DEV_PID" ]; then
    echo "  ❌ Expo dev server — DEAD (pid file exists but process gone)"
  else
    echo "  ⭕ Expo dev server — NOT STARTED"
  fi
}

cmd_logs() {
  if [ ! -f "$DEV_LOG" ]; then
    err "No log file yet — has the dev server been started with --bg? ($DEV_LOG)"
    return 1
  fi
  if [ "${1:-}" = "-f" ]; then
    tail -f "$DEV_LOG"
  else
    tail -100 "$DEV_LOG"
  fi
}

# ==============================================================================
#  deploy / submit / update (EAS cloud)
# ==============================================================================
cmd_deploy() {
  local platform="${1:-}"
  shift || true
  local profile="production"
  while [ $# -gt 0 ]; do
    case "$1" in
      --profile) profile="$2"; shift 2 ;;
      *) err "Unknown option: $1"; return 1 ;;
    esac
  done

  case "$platform" in
    android|ios|all) ;;
    *)
      err "Usage: ./aviqr-mobile.sh deploy <android|ios|all> [--profile <profile>]"
      return 1
      ;;
  esac

  echo "→ eas build --platform $platform --profile $profile"
  (cd "$BASE" && npx eas-cli build --platform "$platform" --profile "$profile")
}

cmd_submit() {
  local platform="${1:-}"
  case "$platform" in
    android|ios) ;;
    *)
      err "Usage: ./aviqr-mobile.sh submit <android|ios>"
      return 1
      ;;
  esac

  echo "→ eas submit --platform $platform"
  (cd "$BASE" && npx eas-cli submit --platform "$platform")
}

cmd_update() {
  local branch="" message=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --branch) branch="$2"; shift 2 ;;
      --message) message="$2"; shift 2 ;;
      *) err "Unknown option: $1"; return 1 ;;
    esac
  done

  local args=()
  [ -n "$branch" ] && args+=(--branch "$branch")
  [ -n "$message" ] && args+=(--message "$message")

  echo "→ eas update ${args[*]}"
  (cd "$BASE" && npx eas-cli update "${args[@]}")
}

# ==============================================================================
#  main
# ==============================================================================
main() {
  local cmd="${1:-help}"
  shift || true
  case "$cmd" in
    help|-h|--help) cmd_help ;;
    install)        cmd_install ;;
    bundle)         cmd_bundle ;;
    start)          cmd_start "$@" ;;
    stop)           cmd_stop ;;
    status)         cmd_status ;;
    logs)           cmd_logs "$@" ;;
    deploy)         cmd_deploy "$@" ;;
    submit)         cmd_submit "$@" ;;
    update)         cmd_update "$@" ;;
    *)
      err "Unknown command: $cmd"
      echo ""
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
