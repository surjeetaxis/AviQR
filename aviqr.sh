#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  aviqr.sh  —  AviQR master script
#
#  Works with OR without Docker. Auto-detects what's installed.
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
#
#  DOCKER USERS (optional)
#  ──────────────────────
#  ./aviqr.sh docker up      → docker compose up -d (all infra + services)
#  ./aviqr.sh docker build   → build all Docker images (no local Java needed)
#  ./aviqr.sh docker down    → docker compose down
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
has_docker() { has docker && docker info >/dev/null 2>&1; }
has_java()   { has java && java -version 2>&1 | grep -q '2[1-9]\|[3-9][0-9]'; }
has_gradle() {
  # gradlew (wrapper) preferred; fall back to system gradle ≥7
  if [ -f "$BACKEND/gradlew" ] && [ -f "$BACKEND/gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "wrapper"
  elif has gradle && gradle --version 2>/dev/null | grep -qP 'Gradle [7-9]\d*\.'; then
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
      echo "  OR use Docker (no local Gradle needed):"
      echo "    ./aviqr.sh docker build"
      exit 1 ;;
  esac
}

# ── check ──────────────────────────────────────────────────────────────────────
cmd_check() {
  banner "AviQR — Environment Check"

  echo "  Required for backend (local mode):"
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
  echo "  Optional (Docker):"
  has_docker && ok "Docker (running)" || warn "Docker not found — local mode will be used"

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

  if has_docker; then
    info "Docker detected — using Docker for infrastructure (easiest)"
    echo ""
    echo "  This will start PostgreSQL, MongoDB, Redis and RabbitMQ in Docker containers"
    echo "  and create all AviQR databases automatically."
    echo ""
    read -rp "  Continue? [Y/n] " reply
    [[ "${reply:-y}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

    info "Starting infrastructure containers…"
    (cd "$BACKEND" && docker compose up -d postgres mongo redis rabbitmq)
    info "Waiting 30s for containers to initialise…"
    sleep 30
    ok "Infrastructure ready"
    echo ""
    echo "  PostgreSQL : localhost:5432  (aviqr / aviqr_secret)"
    echo "  MongoDB    : localhost:27017 (aviqr / aviqr_secret)"
    echo "  Redis      : localhost:6379  (password: aviqr_redis_secret)"
    echo "  RabbitMQ   : localhost:5672  (aviqr / aviqr_secret)"
    echo "  RabbitMQ UI: http://localhost:15672"
    echo ""
    echo "  Next: ./aviqr.sh build"
    return
  fi

  # No Docker — install natively
  if [[ "$(uname -s)" == "Darwin" ]]; then
    _setup_mac
  elif command -v apt-get >/dev/null 2>&1; then
    _setup_ubuntu
  else
    echo ""
    echo "  Automatic setup is supported on macOS (brew) and Ubuntu/Debian (apt)."
    echo "  For other systems, see INSTALL.md for manual steps."
    echo ""
    echo "  OR install Docker and re-run: ./aviqr.sh setup"
    echo "  Docker: https://docs.docker.com/get-docker/"
  fi
}

_setup_mac() {
  banner "macOS Setup (Homebrew)"
  has brew || { err "Homebrew not found. Install: https://brew.sh"; exit 1; }
  echo "  Installing Java 21, PostgreSQL, MongoDB, Redis, RabbitMQ, Node.js, Gradle…"
  brew install openjdk@21 postgresql@17 mongodb-community redis rabbitmq node@20 gradle
  brew services start postgresql@17
  brew services start mongodb-community
  brew services start redis
  brew services start rabbitmq
  _create_dbs
  ok "macOS setup complete"
}

_setup_ubuntu() {
  banner "Ubuntu / Debian Setup (apt)"
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

  # PostgreSQL
  if has psql; then
    local SQL_CONTENT="DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aviqr') THEN
    CREATE ROLE aviqr WITH LOGIN PASSWORD 'aviqr_secret' CREATEDB;
  END IF;
END \$\$;
CREATE DATABASE IF NOT EXISTS aviqr_auth    WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_shop    WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_menu    WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_order   WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_payment WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_qr      WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_hotel   WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_mall    WITH OWNER aviqr;
CREATE DATABASE IF NOT EXISTS aviqr_support WITH OWNER aviqr;"
    echo "$SQL_CONTENT" | sudo -u postgres psql 2>/dev/null || \
    echo "$SQL_CONTENT" | psql -U postgres 2>/dev/null || true
    ok "PostgreSQL databases created"
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
    sudo rabbitmqctl add_user aviqr aviqr_secret 2>/dev/null || true
    sudo rabbitmqctl set_user_tags aviqr administrator 2>/dev/null || true
    sudo rabbitmqctl set_permissions -p / aviqr '.*' '.*' '.*' 2>/dev/null || true
    ok "RabbitMQ user created"
  fi
}

# ── build ──────────────────────────────────────────────────────────────────────
cmd_build() {
  local TARGET="${1:-all}"

  if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
    banner "Building backend (14 Spring Boot services)"
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

    if has_docker; then
      info "Docker detected — starting via docker compose"
      (cd "$BACKEND" && docker compose up -d)
      info "Waiting 60s for all services to register in Eureka…"
      sleep 60
    else
      info "No Docker — starting services with local Java"
      info "Starting infrastructure first…"
      _check_local_infra
      info "Starting all 14 services (this takes ~2 min)…"
      (cd "$BACKEND" && bash aviqr.sh run all)
    fi

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
    echo "    sudo systemctl start postgresql mongod redis rabbitmq-server"
    echo ""
    echo "  OR install Docker and use:"
    echo "    ./aviqr.sh docker up"
    exit 1
  fi
  ok "All infrastructure is reachable"
}

# ── stop ───────────────────────────────────────────────────────────────────────
cmd_stop() {
  local TARGET="${1:-all}"

  if [[ "$TARGET" == "backend" || "$TARGET" == "all" ]]; then
    if has_docker; then
      info "Stopping backend containers…"
      (cd "$BACKEND" && docker compose stop 2>/dev/null || true)
    else
      info "Stopping local backend services…"
      (cd "$BACKEND" && bash aviqr.sh stop all 2>/dev/null || true)
    fi
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

  if has_docker; then
    echo "  Docker containers:"
    docker ps --format "    {{.Names}}  {{.Status}}" 2>/dev/null | grep aviqr || echo "    (none running)"
    echo ""
  else
    echo "  Local services (checking ports):"
    for name_port in "service-registry:8761" "api-gateway:8080" "auth-service:dyn" "shop-service:dyn" "menu-service:dyn" "order-service:dyn"; do
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
  fi

  echo "  Endpoint health:"
  for url_name in "http://localhost:8761/actuator/health:Eureka" "http://localhost:8080/actuator/health:API Gateway"; do
    local url="${url_name%%:*}" name="${url_name##*:}"
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
      echo "  (service logs via docker or local log files)"
      ;;
    *)
      # Try docker logs first, then local log file
      local svc="$TARGET"
      [[ "$svc" != *-service && "$svc" != "api-gateway" && "$svc" != "service-registry" ]] && svc="${TARGET}-service"
      if has_docker; then
        docker logs -f "aviqr-${TARGET}" 2>/dev/null || \
        docker logs -f "$svc" 2>/dev/null || \
        (cd "$BACKEND" && bash aviqr.sh logs "$svc" -f 2>/dev/null) || \
        warn "Service '$TARGET' not found"
      else
        (cd "$BACKEND" && bash aviqr.sh logs "$svc" -f 2>/dev/null) || \
        warn "Service '$TARGET' not found"
      fi
      ;;
  esac
}

# ── docker commands ─────────────────────────────────────────────────────────────
cmd_docker() {
  local ACTION="${1:-help}"
  if ! has docker; then
    err "Docker not found."
    echo ""
    echo "  Install Docker Desktop: https://docs.docker.com/get-docker/"
    echo ""
    echo "  While Docker is not installed, use local mode:"
    echo "    ./aviqr.sh setup     # install PostgreSQL/MongoDB/Redis/RabbitMQ"
    echo "    ./aviqr.sh build"
    echo "    ./aviqr.sh start"
    exit 1
  fi
  case "$ACTION" in
    up|start)
      banner "Docker — starting all services"
      (cd "$BACKEND" && docker compose up -d)
      info "Waiting 60s for services to register…"
      sleep 60
      cmd_status
      ;;
    build)
      banner "Docker — building all 14 images"
      info "This runs Gradle inside Docker — no local Java needed"
      info "First build takes 10–15 min (downloads dependencies)"
      (cd "$BACKEND" && docker compose build --parallel)
      ok "All images built"
      ;;
    down|stop)
      (cd "$BACKEND" && docker compose down)
      ok "All containers stopped"
      ;;
    infra)
      info "Starting infrastructure only (postgres/mongo/redis/rabbitmq)…"
      (cd "$BACKEND" && docker compose up -d postgres mongo redis rabbitmq)
      sleep 15
      ok "Infrastructure up"
      ;;
    help|*)
      echo "  ./aviqr.sh docker up      Start all services"
      echo "  ./aviqr.sh docker build   Build images (no local Gradle)"
      echo "  ./aviqr.sh docker infra   Start infra only"
      echo "  ./aviqr.sh docker down    Stop all"
      ;;
  esac
}

# ── quick start guide ──────────────────────────────────────────────────────────
cmd_quickstart() {
  banner "AviQR — Quick Start"

  if has_docker; then
    echo "  Docker detected ✓ — using Docker path (easiest)"
    echo ""
    echo "  Step 1: Start infrastructure"
    echo "    ./aviqr.sh docker infra"
    echo ""
    echo "  Step 2: Build all 14 microservices"
    echo "    ./aviqr.sh build backend           (needs Java 21 + Gradle)"
    echo "    # OR (no Java needed):"
    echo "    ./aviqr.sh docker build"
    echo ""
    echo "  Step 3: Start backend"
    echo "    ./aviqr.sh docker up"
    echo ""
    echo "  Step 4: Start web"
    echo "    ./aviqr.sh start web"
    echo ""
    echo "  Step 5: Open browser"
    echo "    http://localhost:5173"
  else
    echo "  Docker not found — using local mode"
    echo ""
    echo "  Step 1: Install prerequisites"
    echo "    ./aviqr.sh setup          (installs Java, PG, Mongo, Redis, RabbitMQ)"
    echo ""
    echo "  Step 2: Build"
    echo "    ./aviqr.sh build"
    echo ""
    echo "  Step 3: Start"
    echo "    ./aviqr.sh start"
    echo ""
    echo "  Step 4: Open browser"
    echo "    http://localhost:5173"
    echo ""
    echo "  TIP: Install Docker for much easier dependency management:"
    echo "    https://docs.docker.com/get-docker/"
  fi
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
  ./aviqr.sh start [backend|web] Start services
  ./aviqr.sh stop  [backend|web] Stop services
  ./aviqr.sh status              Show running services + health
  ./aviqr.sh logs  <service>     Tail logs (e.g. logs auth, logs web)

  DOCKER (if Docker is installed)
  ════════════════════════════════
  ./aviqr.sh docker build        Build all Docker images (no local Java needed)
  ./aviqr.sh docker up           Start all services in Docker
  ./aviqr.sh docker infra        Start infra only (postgres/mongo/redis/rabbitmq)
  ./aviqr.sh docker down         Stop all containers

  BACKEND ADVANCED (from aviqr-backend/)
  ═══════════════════════════════════════
  cd aviqr-backend
  ./aviqr.sh check               Check all backend prerequisites
  ./aviqr.sh install --yes       Auto-install system packages (Ubuntu/Debian)
  ./aviqr.sh build               Build all 14 JARs
  ./aviqr.sh run all             Start all services locally (no Docker)
  ./aviqr.sh run auth-service    Run one service in foreground
  ./aviqr.sh status              Per-service running status
  ./aviqr.sh logs auth-service -f  Follow log

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
  docker)            cmd_docker "${1:-help}" ;;
  *)
    err "Unknown command: $CMD"
    cmd_usage
    exit 1 ;;
esac
