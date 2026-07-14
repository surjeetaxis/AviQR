#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  aviqr.sh  —  AviQR master script (native, no Docker)
#
#  COMMANDS
#  ────────
#  ./aviqr.sh setup          → Install prerequisites + create DBs (first-time)
#  ./aviqr.sh check          → Show what's installed and what's missing
#  ./aviqr.sh build          → Build all backend JARs + web bundle
#  ./aviqr.sh start          → Start everything (backend + web dev server)
#  ./aviqr.sh stop           → Stop everything
#  ./aviqr.sh status         → Show running services
#  ./aviqr.sh logs [service] → Tail service log
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

BASE="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$BASE/aviqr-backend"
WEB="$BASE/aviqr-ui-web"
MOBILE="$BASE/aviqr-mobile-expo"
LOGS="$BASE/logs"
mkdir -p "$LOGS"

# ── Colour helpers ─────────────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
ok()    { echo -e "${G}  ✓  $*${N}"; }
warn()  { echo -e "${Y}  ⚠  $*${N}"; }
err()   { echo -e "${R}  ✗  $*${N}"; }
info()  { echo -e "${B}  →  $*${N}"; }
banner(){ echo ""; echo "  ┌─────────────────────────────────────────┐"; printf "  │  %-39s│\n" "$1"; echo "  └─────────────────────────────────────────┘"; echo ""; }

# ── Tool detection ─────────────────────────────────────────────────────────────
has()        { command -v "$1" >/dev/null 2>&1; }
has_java()   { has java && java -version 2>&1 | grep -q '2[1-9]\|[3-9][0-9]'; }
has_gradle() {
  # gradlew (wrapper) preferred; fall back to system gradle ≥7
  if [ -f "$BACKEND/gradlew" ] && [ -f "$BACKEND/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "wrapper"
  elif has gradle && gradle --version 2>/dev/null | grep -qE 'Gradle [7-9][0-9]*\.'; then
    echo "system"
  else
    echo "none"
  fi
}
run_gradle() {
  local MODE; MODE=$(has_gradle)
  case "$MODE" in
    wrapper) (cd "$BACKEND" && bash ./gradlew "$@") ;;
    system)  (cd "$BACKEND" && gradle "$@") ;;
    none)
      err "Gradle 8+ not found."
      echo ""
      echo "  Install via SDKMAN (recommended):"
      echo "    curl -s https://get.sdkman.io | bash"
      echo "    source ~/.sdkman/bin/sdkman-init.sh"
      echo "    sdk install gradle 8.10.2"
      echo ""
      echo "  OR on macOS: brew install gradle"
      exit 1 ;;
  esac
}

# ── check ──────────────────────────────────────────────────────────────────────
cmd_check() {
  banner "AviQR — Environment Check"

  echo "  Required for backend:"
  has_java  && ok "Java 21+" || warn "Java 21+ not found  →  https://adoptium.net/temurin/releases/?version=21"
  [ "$(has_gradle)" != "none" ] && ok "Gradle ($(has_gradle))" || warn "Gradle 8+ not found  →  sdk install gradle 8.10.2"
  has pg_isready   && ok "PostgreSQL" || warn "PostgreSQL not found  →  ./aviqr.sh setup"
  has mongod       && ok "MongoDB"    || warn "MongoDB not found     →  ./aviqr.sh setup"
  redis-cli ping >/dev/null 2>&1 && ok "Redis" || warn "Redis not running     →  ./aviqr.sh setup"
  rabbitmqctl status >/dev/null 2>&1 && ok "RabbitMQ" || warn "RabbitMQ not running  →  ./aviqr.sh setup"

  echo ""
  echo "  Required for web:"
  has node && ok "Node.js $(node --version)" || warn "Node.js not found  →  https://nodejs.org"
  has npm  && ok "npm $(npm --version)"       || warn "npm not found"

  echo ""
  echo "  Connectivity (localhost):"
  for svc_port in "PostgreSQL:5432" "MongoDB:27017" "Redis:6379" "RabbitMQ:5672" "Eureka:8761" "Gateway:8080"; do
    local svc="${svc_port%%:*}"; local port="${svc_port##*:}"
    if bash -c ">/dev/tcp/localhost/$port" 2>/dev/null; then
      ok "$svc listening on :$port"
    else
      echo "    $svc :$port — not reachable"
    fi
  done
  echo ""
}

# ── setup (first-time install of all prerequisites) ───────────────────────────
cmd_setup() {
  banner "AviQR — First-Time Setup"

  if [[ "$(uname -s)" == "Darwin" ]]; then
    _setup_mac
  elif command -v apt-get >/dev/null 2>&1; then
    _setup_ubuntu
  else
    echo ""
    echo "  Automatic setup is supported on macOS (brew) and Ubuntu/Debian (apt)."
    echo "  For other systems, see INSTALL.md for manual steps."
  fi
}

_setup_mac() {
  banner "macOS Setup (Homebrew)"
  if [ -x "$BACKEND/install-mac.sh" ]; then
    "$BACKEND/install-mac.sh" --yes
  else
    has brew || { err "Homebrew not found. Install: https://brew.sh"; exit 1; }
    echo "  Installing Java 21, PostgreSQL, MongoDB, Redis, RabbitMQ, Node.js, Gradle…"
    brew install openjdk@21 postgresql@17 mongodb-community redis rabbitmq node@20 gradle
    brew services start postgresql@17
    brew services start mongodb-community
    brew services start redis
    brew services start rabbitmq
    _create_dbs
    ok "macOS setup complete"
  fi
}

_setup_ubuntu() {
  banner "Ubuntu / Debian Setup (apt)"
  if [ -x "$BACKEND/aviqr.sh" ]; then
    (cd "$BACKEND" && ./aviqr.sh install --yes)
    return
  fi

  echo "  This will install Java 21, PostgreSQL, MongoDB, Redis, RabbitMQ, Node.js"
  read -rp "  Proceed with sudo apt install? [Y/n] " reply
  [[ "${reply:-y}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

  sudo apt-get update -q

  # Java 21
  sudo apt-get install -y openjdk-21-jdk

  # PostgreSQL 16
  sudo apt-get install -y postgresql postgresql-client
  sudo systemctl enable --now postgresql

  # MongoDB 7
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
    https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  sudo apt-get update -q && sudo apt-get install -y mongodb-org
  sudo systemctl enable --now mongod

  # Redis
  sudo apt-get install -y redis-server
  sudo sed -i 's/^# requirepass .*/requirepass aviqr_redis_secret/' /etc/redis/redis.conf
  sudo systemctl enable --now redis-server

  # RabbitMQ
  sudo apt-get install -y rabbitmq-server
  sudo systemctl enable --now rabbitmq-server
  sudo rabbitmq-plugins enable rabbitmq_management 2>/dev/null || true

  # Node.js 20
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs

  _create_dbs
  ok "Ubuntu setup complete. Run: ./aviqr.sh build"
}

_create_dbs() {
  info "Creating PostgreSQL databases and aviqr user…"

  if has psql; then
    if [ -f "$BACKEND/aviqr_setup.sql" ]; then
      if [[ "$(uname -s)" == "Darwin" ]]; then
        psql postgres -f "$BACKEND/aviqr_setup.sql" 2>/dev/null || true
      else
        sudo -u postgres psql -f "$BACKEND/aviqr_setup.sql" 2>/dev/null || \
        psql -U postgres -f "$BACKEND/aviqr_setup.sql" 2>/dev/null || true
      fi
      ok "PostgreSQL databases created"
    fi
  fi

  # MongoDB user
  if has mongosh; then
    mongosh --quiet admin --eval "
      try { db.createUser({ user: 'aviqr', pwd: 'aviqr_secret',
        roles: [{ role: 'root', db: 'admin' }] }) } catch(e) {}
    " 2>/dev/null || true
    ok "MongoDB user created"
  fi

  # RabbitMQ user
  if has rabbitmqctl; then
    rabbitmqctl add_user aviqr aviqr_secret 2>/dev/null || \
    sudo rabbitmqctl add_user aviqr aviqr_secret 2>/dev/null || true
    rabbitmqctl set_user_tags aviqr administrator 2>/dev/null || \
    sudo rabbitmqctl set_user_tags aviqr administrator 2>/dev/null || true
    rabbitmqctl set_permissions -p / aviqr '.*' '.*' '.*' 2>/dev/null || \
    sudo rabbitmqctl set_permissions -p / aviqr '.*' '.*' '.*' 2>/dev/null || true
    ok "RabbitMQ user created"
  fi
}

# ── build ──────────────────────────────────────────────────────────────────────
cmd_build() {
  local TARGET="${1:-all}"

  if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
    banner "Building backend (10 Spring Boot services)"
    if ! has_java; then
      err "Java 21+ not found. Run: ./aviqr.sh setup"
      exit 1
    fi
    ok "Java detected: $(java -version 2>&1 | head -1)"
    run_gradle build -x test --parallel
    ok "Backend build complete"
  fi

  if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
    banner "Building web (React + Vite)"
    if ! has node; then
      err "Node.js not found. Run: ./aviqr.sh setup"
      exit 1
    fi
    (cd "$WEB" && npm install --silent && npm run build)
    ok "Web build complete → aviqr-ui-web/dist/"
  fi
}

# ── start ──────────────────────────────────────────────────────────────────────
cmd_start() {
  local TARGET="${1:-all}"

  if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
    banner "Starting backend"
    info "Checking infrastructure first…"
    _check_local_infra
    info "Starting all 10 services (this takes ~2 min)…"
    (cd "$BACKEND" && bash aviqr.sh run all)

    # Health check
    local health; health=$(curl -sf http://localhost:8080/actuator/health 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "starting")
    if [[ "$health" == "UP" ]]; then
      ok "API Gateway UP → http://localhost:8080"
    else
      warn "Gateway still starting (status: $health)"
      echo "     Check: curl http://localhost:8080/actuator/health"
      echo "     Logs:  ./aviqr.sh logs auth"
    fi

    echo ""
    ok "Eureka dashboard → http://localhost:8761"
  fi

  if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
    banner "Starting web dev server"
    if ! has node; then
      err "Node.js not found. Run: ./aviqr.sh setup"
      exit 1
    fi
    if [ ! -f "$WEB/node_modules/.bin/vite" ]; then
      info "Installing npm packages…"
      (cd "$WEB" && npm install --silent)
    fi
    nohup bash -c "cd '$WEB' && npm run dev" > "$LOGS/web.log" 2>&1 &
    echo $! > "$LOGS/web.pid"
    sleep 3
    ok "Web dev server → http://localhost:5173"
    echo "     Logs: ./aviqr.sh logs web"
  fi
}

_check_local_infra() {
  local missing=()
  bash -c ">/dev/tcp/localhost/5432" 2>/dev/null || missing+=("PostgreSQL :5432")
  bash -c ">/dev/tcp/localhost/27017" 2>/dev/null || missing+=("MongoDB :27017")
  bash -c ">/dev/tcp/localhost/6379" 2>/dev/null || missing+=("Redis :6379")
  bash -c ">/dev/tcp/localhost/5672" 2>/dev/null || missing+=("RabbitMQ :5672")

  if [ ${#missing[@]} -gt 0 ]; then
    err "Infrastructure not running:"
    for m in "${missing[@]}"; do echo "     • $m"; done
    echo ""
    echo "  Start it first:"
    echo "    ./aviqr.sh setup          # first time — installs + starts"
    echo "    sudo systemctl start postgresql mongod redis rabbitmq-server   # Linux"
    echo "    brew services start postgresql@17 mongodb-community redis rabbitmq  # Mac"
    exit 1
  fi
  ok "All infrastructure is reachable"
}

# ── stop ───────────────────────────────────────────────────────────────────────
cmd_stop() {
  local TARGET="${1:-all}"

  if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
    info "Stopping local backend services…"
    (cd "$BACKEND" && bash aviqr.sh stop all 2>/dev/null || true)
    ok "Backend stopped"
  fi

  if [[ "$TARGET" == "web" || "$TARGET" == "all" ]]; then
    if [ -f "$LOGS/web.pid" ]; then
      local pid; pid=$(cat "$LOGS/web.pid")
      kill "$pid" 2>/dev/null && ok "Web stopped (pid $pid)" || warn "Web was not running"
      rm -f "$LOGS/web.pid"
    else
      warn "Web not running"
    fi
    fuser -k 5173/tcp >/dev/null 2>&1 || true
  fi
}

# ── status ─────────────────────────────────────────────────────────────────────
cmd_status() {
  banner "AviQR Status"

  echo "  Local services (checking ports):"
  for name_port in "service-registry:8761" "api-gateway:8080" "auth-service:dyn" "shop-mall-service:dyn" "menu-ocr-service:dyn" "order-qr-service:dyn" "payment-service:dyn" "hotel-service:dyn" "support-service:dyn" "notification-report-review-service:dyn"; do
    local n="${name_port%%:*}" p="${name_port##*:}"
    if [[ "$p" != "dyn" ]] && bash -c ">/dev/tcp/localhost/$p" 2>/dev/null; then
      ok "$n :$p"
    elif [[ "$p" == "dyn" ]]; then
      pgrep -f "$n" >/dev/null 2>&1 && ok "$n (running)" || echo "    ✗ $n"
    else
      echo "    ✗ $n :$p"
    fi
  done
  echo ""

  echo "  Endpoint health:"
  for url_name in "http://localhost:8761/actuator/health|Eureka" "http://localhost:8080/actuator/health|API Gateway"; do
    local url="${url_name%%|*}" name="${url_name##*|}"
    local s; s=$(curl -sf "$url" 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('status','?'))" 2>/dev/null || echo "unreachable")
    [[ "$s" == "UP" ]] && ok "$name ($s)" || echo "    $name — $s"
  done

  echo ""
  echo "  Web:"
  if [ -f "$LOGS/web.pid" ] && kill -0 "$(cat "$LOGS/web.pid")" 2>/dev/null; then
    ok "Vite dev server → http://localhost:5173"
  else
    echo "    Not running  →  ./aviqr.sh start web"
  fi

  echo ""
  echo "  Useful links:"
  echo "    Dashboard  → http://localhost:5173/dashboard"
  echo "    Eureka     → http://localhost:8761"
  echo "    RabbitMQ   → http://localhost:15672  (aviqr / aviqr_secret)"
  echo ""
}

# ── logs ───────────────────────────────────────────────────────────────────────
cmd_logs() {
  local TARGET="${1:-help}"
  case "$TARGET" in
    web)     tail -f "$LOGS/web.log" 2>/dev/null || warn "Web not started" ;;
    mobile)  tail -f "$LOGS/mobile.log" 2>/dev/null || warn "Mobile not started" ;;
    help)
      echo ""
      echo "  Usage: ./aviqr.sh logs <service>"
      echo ""
      echo "  ./aviqr.sh logs web                    Web dev server"
      echo "  ./aviqr.sh logs auth                   auth-service"
      echo "  ./aviqr.sh logs order                  order-service"
      echo "  ./aviqr.sh logs gateway                api-gateway"
      echo ""
      ;;
    *)
      local svc="$TARGET"
      [[ "$svc" != *-service && "$svc" != "api-gateway" && "$svc" != "service-registry" ]] && svc="${TARGET}-service"
      (cd "$BACKEND" && bash aviqr.sh logs "$svc" -f 2>/dev/null) || \
      warn "Service '$TARGET' not found"
      ;;
  esac
}

# ── quick start guide ──────────────────────────────────────────────────────────
cmd_quickstart() {
  banner "AviQR — Quick Start"

  echo "  Step 1: Install prerequisites"
  echo "    ./aviqr.sh setup          (installs Java, PG, Mongo, Redis, RabbitMQ)"
  echo ""
  echo "  Step 2: Build"
  echo "    ./aviqr.sh build"
  echo ""
  echo "  Step 3: Start (backend + web together)"
  echo "    ./aviqr.sh start"
  echo ""
  echo "  Step 4: Open browser"
  echo "    http://localhost:5173"
  echo ""
  echo "  Prefer to run backend/web separately, or one backend service at a time?"
  echo "  See BACKEND ADVANCED and WEB ADVANCED sections in: ./aviqr.sh help"
  echo ""
}

# ── usage ──────────────────────────────────────────────────────────────────────
cmd_usage() {
  cat << 'EOF'

  AviQR — QR Restaurant & Hotel Platform

  COMMANDS
  ════════
  ./aviqr.sh                     Show this help
  ./aviqr.sh quickstart          Step-by-step guide for your environment
  ./aviqr.sh check               Check what's installed / what's missing
  ./aviqr.sh setup               Install all prerequisites (first time)

  ./aviqr.sh build [backend|web] Build JARs and/or web bundle
  ./aviqr.sh start [backend|web] Start services (default: both)
  ./aviqr.sh stop  [backend|web] Stop services
  ./aviqr.sh status              Show running services + health
  ./aviqr.sh logs  <service>     Tail logs (e.g. logs auth, logs web)

  BACKEND ADVANCED — run one service at a time (from aviqr-backend/)
  ════════════════════════════════════════════════════════════════
  cd aviqr-backend
  ./aviqr.sh check                 Check all backend prerequisites
  ./aviqr.sh install --yes         Auto-install system packages (Mac/Ubuntu)
  ./aviqr.sh db-setup               Seed the database
  ./aviqr.sh build                 Build all 10 JARs
  ./aviqr.sh run all                Start all services locally
  ./aviqr.sh run auth-service       Run one service in foreground
  ./aviqr.sh run auth-service --bg  Run one service in background
  ./aviqr.sh status                 Per-service running status
  ./aviqr.sh logs auth-service -f   Follow log

  WEB ADVANCED — run just the UI (from aviqr-ui-web/)
  ════════════════════════════════════════════════════
  cd aviqr-ui-web
  ./run.sh          Install deps (if needed) + start the Vite dev server
  ./run.sh build    Production build → dist/

EOF
}

# ── dispatch ───────────────────────────────────────────────────────────────────
CMD="${1:-}"
shift 2>/dev/null || true

case "$CMD" in
  ""|help|--help|-h) cmd_usage ;;
  quickstart|qs)     cmd_quickstart ;;
  check)             cmd_check ;;
  setup|install)     cmd_setup ;;
  build)             cmd_build "${1:-all}" ;;
  start)             cmd_start "${1:-all}" ;;
  stop)              cmd_stop  "${1:-all}" ;;
  restart)           cmd_stop "${1:-all}"; cmd_start "${1:-all}" ;;
  status)            cmd_status ;;
  logs)              cmd_logs "${1:-help}" ;;
  *)
    err "Unknown command: $CMD"
    cmd_usage
    exit 1 ;;
esac
