#!/bin/bash
# AviQR — single entrypoint to build / start / stop / restart / status / logs
# for backend (14 microservices) and aviqr-ui-web.
#
# Usage:
#   ./aviqr.sh build   [backend|web|all]   # default: all
#   ./aviqr.sh start   [backend|web|all]
#   ./aviqr.sh stop    [backend|web|all]
#   ./aviqr.sh restart [backend|web|all]
#   ./aviqr.sh status
#   ./aviqr.sh logs    [backend|web|all]    # tail -f
#
# Backend start/stop/status delegates to aviqr-backend/{start-all,stop-all,status}.sh,
# which start service-registry first and then the other 14 services in small
# batches (4 at a time by default — see AVIQR_START_BATCH_SIZE), polling each
# batch until it registers before starting the next. This script only adds
# equivalent process management for the web (Vite) dev server.

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR="$BASE/aviqr-backend"
WEB_DIR="$BASE/aviqr-ui-web"
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

WEB_PID="$LOG_DIR/web.pid"
WEB_LOG="$LOG_DIR/web.log"

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
  echo " Web Status"
  echo "================================================"
  status_proc "web (http://localhost:5173)" "$WEB_PID"
}

# ── logs ─────────────────────────────────────────────────────────────────────
logs_backend() { tail -f "$BACKEND_DIR"/logs/*.log; }
logs_web()     { tail -f "$WEB_LOG"; }
logs_all()     { tail -f "$BACKEND_DIR"/logs/*.log "$WEB_LOG"; }

# ── dispatch ─────────────────────────────────────────────────────────────────
cmd=${1:-}
target=${2:-all}

usage() {
  echo "Usage: $0 {build|start|stop|restart|status|logs} [backend|web|all]"
  exit 1
}

[ -z "$cmd" ] && usage

case "$cmd" in
  build)
    case "$target" in
      backend) build_backend ;;
      web)     build_web ;;
      all)     build_backend; build_web ;;
      *) usage ;;
    esac
    ;;
  start|deploy)
    case "$target" in
      backend) start_backend ;;
      web)     start_web ;;
      all)     start_backend; start_web ;;
      *) usage ;;
    esac
    ;;
  stop)
    case "$target" in
      backend) stop_backend ;;
      web)     stop_web ;;
      all)     stop_backend; stop_web ;;
      *) usage ;;
    esac
    ;;
  restart)
    case "$target" in
      backend) stop_backend; start_backend ;;
      web)     stop_web; start_web ;;
      all)     stop_backend; stop_web; start_backend; start_web ;;
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
      all)     logs_all ;;
      *) usage ;;
    esac
    ;;
  *)
    usage
    ;;
esac