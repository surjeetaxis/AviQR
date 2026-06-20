#!/bin/bash
# AviQR — single entrypoint to build / start / stop / restart / status / logs
# for all three apps: backend (14 microservices), aviqr-ui-web, aviqr-mobile-expo.
#
# Usage:
#   ./aviqr.sh build   [backend|web|mobile|all]   # default: all
#   ./aviqr.sh start   [backend|web|mobile|all]
#   ./aviqr.sh stop    [backend|web|mobile|all]
#   ./aviqr.sh restart [backend|web|mobile|all]
#   ./aviqr.sh status
#   ./aviqr.sh logs    [backend|web|mobile|all]    # tail -f
#
# Backend start/stop/status delegates to aviqr-backend/{start-all,stop-all,status}.sh,
# which already know the correct boot order for the 14 services. This script only
# adds equivalent process management for the web (Vite) and mobile (Expo) dev servers.

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR="$BASE/aviqr-backend"
WEB_DIR="$BASE/aviqr-ui-web"
MOBILE_DIR="$BASE/aviqr-mobile-expo"
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

WEB_PID="$LOG_DIR/web.pid"
WEB_LOG="$LOG_DIR/web.log"
MOBILE_PID="$LOG_DIR/mobile.pid"
MOBILE_LOG="$LOG_DIR/mobile.log"

# ── helpers ──────────────────────────────────────────────────────────────────
is_running() {
  local pid_file=$1
  [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

# ── build ────────────────────────────────────────────────────────────────────
build_backend() {
  echo "→ Building backend (gradlew build -x test)..."
  (cd "$BACKEND_DIR" && ./gradlew build -x test)
}

build_web() {
  echo "→ Building web (npm run build)..."
  (cd "$WEB_DIR" && npm install --silent && npm run build)
}

build_mobile() {
  # Native APK/IPA builds go through `eas build` (cloud, needs Expo credentials) —
  # out of scope for local dev. This just verifies the JS bundle resolves.
  echo "→ Checking mobile bundle (expo export, web target)..."
  (cd "$MOBILE_DIR" && npm install --silent && npx expo export --platform web --output-dir /tmp/aviqr-mobile-export)
}

# ── start ────────────────────────────────────────────────────────────────────
start_backend() {
  echo "→ Starting backend (14 services)..."
  (cd "$BACKEND_DIR" && ./start-all.sh)
}

start_web() {
  if is_running "$WEB_PID"; then
    echo "→ Web already running (pid $(cat "$WEB_PID"))"
    return
  fi
  echo "→ Starting web (Vite dev server, http://localhost:5173)..."
  (cd "$WEB_DIR" && nohup npm run dev > "$WEB_LOG" 2>&1 &
   echo $! > "$WEB_PID")
}

start_mobile() {
  if is_running "$MOBILE_PID"; then
    echo "→ Mobile already running (pid $(cat "$MOBILE_PID"))"
    return
  fi
  echo "→ Starting mobile (Expo dev server / Metro bundler)..."
  (cd "$MOBILE_DIR" && CI=1 nohup npx expo start > "$MOBILE_LOG" 2>&1 &
   echo $! > "$MOBILE_PID")
}

# ── stop ─────────────────────────────────────────────────────────────────────
stop_backend() {
  echo "→ Stopping backend..."
  (cd "$BACKEND_DIR" && ./stop-all.sh)
}

stop_proc() {
  local name=$1 pid_file=$2 port=$3
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && echo "  ✓ Stopped $name (pid $pid)"
    else
      echo "  - $name already stopped"
    fi
    rm -f "$pid_file"
  else
    echo "  ⭕ $name not started"
  fi
  [ -n "$port" ] && fuser -k "${port}/tcp" >/dev/null 2>&1
}

stop_web()    { echo "→ Stopping web...";    stop_proc "web" "$WEB_PID" 5173; }
stop_mobile() { echo "→ Stopping mobile..."; stop_proc "mobile" "$MOBILE_PID" 8081; pkill -f "expo start" 2>/dev/null || true; }

# ── status ───────────────────────────────────────────────────────────────────
status_backend() { (cd "$BACKEND_DIR" && ./status.sh); }

status_proc() {
  local name=$1 pid_file=$2
  if is_running "$pid_file"; then
    echo "  ✅ $name (pid $(cat "$pid_file")) — RUNNING"
  elif [ -f "$pid_file" ]; then
    echo "  ❌ $name — DEAD (pid file exists but process gone)"
  else
    echo "  ⭕ $name — NOT STARTED"
  fi
}

status_all() {
  status_backend
  echo ""
  echo "================================================"
  echo " Web / Mobile Status"
  echo "================================================"
  status_proc "web (http://localhost:5173)" "$WEB_PID"
  status_proc "mobile (Expo/Metro)" "$MOBILE_PID"
}

# ── logs ─────────────────────────────────────────────────────────────────────
logs_backend() { tail -f "$BACKEND_DIR"/logs/*.log; }
logs_web()     { tail -f "$WEB_LOG"; }
logs_mobile()  { tail -f "$MOBILE_LOG"; }
logs_all()     { tail -f "$BACKEND_DIR"/logs/*.log "$WEB_LOG" "$MOBILE_LOG"; }

# ── dispatch ─────────────────────────────────────────────────────────────────
cmd=${1:-}
target=${2:-all}

usage() {
  echo "Usage: $0 {build|start|stop|restart|status|logs} [backend|web|mobile|all]"
  exit 1
}

[ -z "$cmd" ] && usage

case "$cmd" in
  build)
    case "$target" in
      backend) build_backend ;;
      web)     build_web ;;
      mobile)  build_mobile ;;
      all)     build_backend; build_web; build_mobile ;;
      *) usage ;;
    esac
    ;;
  start|deploy)
    case "$target" in
      backend) start_backend ;;
      web)     start_web ;;
      mobile)  start_mobile ;;
      all)     start_backend; start_web; start_mobile ;;
      *) usage ;;
    esac
    ;;
  stop)
    case "$target" in
      backend) stop_backend ;;
      web)     stop_web ;;
      mobile)  stop_mobile ;;
      all)     stop_backend; stop_web; stop_mobile ;;
      *) usage ;;
    esac
    ;;
  restart)
    case "$target" in
      backend) stop_backend; start_backend ;;
      web)     stop_web; start_web ;;
      mobile)  stop_mobile; start_mobile ;;
      all)     stop_backend; stop_web; stop_mobile; start_backend; start_web; start_mobile ;;
      *) usage ;;
    esac
    ;;
  status)
    status_all
    ;;
  logs)
    case "$target" in
      backend) logs_backend ;;
      web)     logs_web ;;
      mobile)  logs_mobile ;;
      all)     logs_all ;;
      *) usage ;;
    esac
    ;;
  *)
    usage
    ;;
esac