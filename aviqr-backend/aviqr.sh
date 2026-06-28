#!/bin/bash
# ==============================================================================
#  aviqr.sh — single entry point for the AviQR backend
#
#  Usage:
#    ./aviqr.sh help                      Show this help
#    ./aviqr.sh list                      List all services (port + description)
#    ./aviqr.sh check                     Check required software + infra status
#    ./aviqr.sh install [--yes]           Show (or run, with --yes) install commands
#    ./aviqr.sh db-setup                  Run aviqr_setup.sql against local Postgres
#    ./aviqr.sh build [all|<service>]     Build all services, or just one
#    ./aviqr.sh clean                     ./gradlew clean
#    ./aviqr.sh run all                   Start every service in the background
#    ./aviqr.sh run <service> [--bg]      Start one service (foreground by default)
#    ./aviqr.sh stop [all|<service>]      Stop service(s) started by this script
#    ./aviqr.sh restart [all|<service>]   stop + run
#    ./aviqr.sh status                    Show running/stopped state of everything
#    ./aviqr.sh logs <service> [-f]       Show (or follow) a service's log file
#
#  Run with no arguments for the same as `help`.
# ==============================================================================

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

# ── Ensure Java 21 is used for all Gradle/Spring Boot invocations ─────────────
if [ -d "/usr/lib/jvm/java-21-openjdk-amd64" ]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
elif [ -d "/usr/lib/jvm/temurin-21" ]; then
  export JAVA_HOME=/usr/lib/jvm/temurin-21
fi

# ── Service catalog (start order matters: registry/gateway/auth go first) ────
SERVICES=(
  service-registry api-gateway auth-service shop-service menu-service
  order-service payment-service qr-service hotel-service mall-service
  support-service notification-service report-service ocr-service review-service
)

desc_for() {
  case "$1" in
    service-registry)     echo "Eureka service discovery — every other service registers here" ;;
    api-gateway)          echo "Spring Cloud Gateway — routing, JWT validation, CORS, rate limiting" ;;
    auth-service)         echo "Register/login, OTP login, JWT issue/refresh, profile, admin user mgmt" ;;
    shop-service)         echo "Shop/restaurant profile, staff, settings" ;;
    menu-service)         echo "Menu items, categories, dynamic pricing rules" ;;
    order-service)        echo "Order lifecycle: create, accept, prepare, complete" ;;
    payment-service)      echo "Razorpay payment orders + webhook verification" ;;
    qr-service)           echo "QR code generation + scan logging" ;;
    hotel-service)        echo "Hotel, room, and room-service request management" ;;
    mall-service)         echo "Mall and vendor management" ;;
    support-service)      echo "Support tickets, audit logs, admin impersonation logs" ;;
    notification-service) echo "SMS/Email notifications, consumes RabbitMQ events" ;;
    report-service)       echo "Reports and analytics" ;;
    ocr-service)          echo "OCR via Google Vision API" ;;
    review-service)       echo "Product and shop reviews, ratings" ;;
    *)                    echo "Unknown service" ;;
  esac
}

port_for() {
  case "$1" in
    service-registry) echo "8761" ;;
    api-gateway)       echo "8080" ;;
    *)                 echo "dynamic*" ;;
  esac
}

is_valid_svc() {
  local s="$1"
  for svc in "${SERVICES[@]}"; do [ "$svc" = "$s" ] && return 0; done
  return 1
}

# ── Output helpers ────────────────────────────────────────────────────────────
ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
err()  { echo "  ❌ $*"; }
hr()   { echo "------------------------------------------------------------------"; }

# ==============================================================================
#  help / list
# ==============================================================================
cmd_help() {
  cat <<'EOF'
================================================================================
 AviQR Backend — 14 Spring Boot microservices behind a Eureka + Gateway stack
================================================================================

Description:
  Multi-tenant backend for the AviQR platform (QR ordering for restaurants,
  hotels, and malls). Built with Java 21 / Spring Boot 3.3 / Spring Cloud 2023.
  Each business service is independently deployable, registers itself with
  Eureka (service-registry), and is reachable only through the api-gateway,
  which validates JWTs and injects X-User-Id / X-User-Role headers downstream.

  Storage: PostgreSQL (one DB per service), MongoDB (audit/logs), Redis
  (gateway rate limiting), RabbitMQ (async notifications/order events).

Usage:
  ./aviqr.sh help                      Show this help
  ./aviqr.sh list                      List all services (port + description)
  ./aviqr.sh check                     Check required software + infra status
  ./aviqr.sh install [--yes]           Show (or run, with --yes) install commands
  ./aviqr.sh db-setup                  Run aviqr_setup.sql against local Postgres
  ./aviqr.sh build [all|<service>]     Build all services, or just one
  ./aviqr.sh clean                     ./gradlew clean
  ./aviqr.sh run all                   Start every service in the background
  ./aviqr.sh run <service> [--bg]      Start one service (foreground by default)
  ./aviqr.sh stop [all|<service>]      Stop service(s) started by this script
  ./aviqr.sh restart [all|<service>]   stop + run
  ./aviqr.sh status                    Show running/stopped state of everything
  ./aviqr.sh logs <service> [-f]       Show (or follow) a service's log file

Examples:
  ./aviqr.sh check
  ./aviqr.sh build auth-service
  ./aviqr.sh run all
  ./aviqr.sh run auth-service --bg
  ./aviqr.sh logs auth-service -f
  ./aviqr.sh stop all

See also: README.md (full setup guide), DEPLOYMENT_NO_DOCKER.md (manual native
install per OS), docker-compose.yml + Makefile (Docker-based alternative).
EOF
}

cmd_list() {
  echo "================================================================================"
  echo " AviQR services (start order)"
  echo "================================================================================"
  printf "  %-22s %-10s %s\n" "SERVICE" "PORT" "DESCRIPTION"
  for svc in "${SERVICES[@]}"; do
    printf "  %-22s %-10s %s\n" "$svc" "$(port_for "$svc")" "$(desc_for "$svc")"
  done
  echo ""
  echo "  * dynamic = picks a random free port and registers it with Eureka"
  echo "    (service-registry); the api-gateway routes to it by service name."
}

# ==============================================================================
#  check — required software + infra reachability
# ==============================================================================
check_cmd_version() {
  # check_cmd_version <label> <command...>
  local label="$1"; shift
  if command -v "$1" >/dev/null 2>&1; then
    local v
    v=$("$@" 2>&1 | head -1)
    ok "$label — $v"
    return 0
  else
    err "$label — not found"
    return 1
  fi
}

check_port() {
  # check_port <label> <host> <port>
  local label="$1" host="$2" port="$3"
  if (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; then
    exec 3<&- 3>&-
    ok "$label — listening on $host:$port"
  else
    err "$label — nothing listening on $host:$port"
  fi
}

cmd_check() {
  echo "================================================================================"
  echo " Required software"
  echo "================================================================================"
  check_cmd_version "Java (need 21)"      java -version
  if [ -x "$BASE/gradlew" ]; then
    ok "Gradle wrapper — present (./gradlew, no separate install needed)"
  else
    check_cmd_version "Gradle (need 8.8)" gradle -version
  fi
  check_cmd_version "PostgreSQL client (need 17+)" psql --version
  check_cmd_version "MongoDB shell (need 8.0)"     mongosh --version
  check_cmd_version "Redis CLI (need 7.4)"         redis-cli --version
  check_cmd_version "Node.js (need 20+, frontend only)" node --version

  echo ""
  echo "================================================================================"
  echo " Infra reachability (localhost)"
  echo "================================================================================"
  check_port "PostgreSQL" localhost 5432
  check_port "MongoDB"    localhost 27017
  check_port "Redis"      localhost 6379
  check_port "RabbitMQ"   localhost 5672
  echo ""
  echo "If any of the above are missing/down, run: ./aviqr.sh install"
}

# ==============================================================================
#  install — print (or run, with --yes) native install commands
#  Linux/apt-focused, since that's what DEPLOYMENT_NO_DOCKER.md documents in
#  full for Mac/Windows too. This only automates the Ubuntu/Debian path.
# ==============================================================================
cmd_install() {
  local AUTO=false
  [ "${1:-}" = "--yes" ] && AUTO=true

  if [ "$(uname -s)" != "Linux" ] || ! command -v apt >/dev/null 2>&1; then
    cat <<'EOF'
This helper only automates Ubuntu/Debian (apt). For Mac/Windows, or a manual
walkthrough, follow DEPLOYMENT_NO_DOCKER.md step by step:

  Mac:     brew install openjdk@21 postgresql@17 mongodb-community@8.0 redis rabbitmq node@20
  Windows: see DEPLOYMENT_NO_DOCKER.md (PART 1) for installer links per tool.

Alternatively, skip native installs entirely and use Docker:
  make up           # postgres, mongo, redis, rabbitmq, + all services
  make up-infra      # just the infra containers
EOF
    return 0
  fi

  cat <<'EOF'
================================================================================
 Required software (Ubuntu/Debian, apt-based)
================================================================================
  Java 21 (JDK)      — sudo apt install -y openjdk-21-jdk
  PostgreSQL 17       — apt.postgresql.org repo, then: apt install -y postgresql-17
  MongoDB 8.0          — repo.mongodb.org repo, then: apt install -y mongodb-org
  Redis 7.4            — packages.redis.io repo, then: apt install -y redis
  RabbitMQ 3.13       — cloudsmith repo + erlang, then: apt install -y rabbitmq-server
  Node.js 20+ (frontend only) — deb.nodesource.com/setup_20.x, then: apt install -y nodejs

Full exact commands are in DEPLOYMENT_NO_DOCKER.md.
EOF

  if [ "$AUTO" != true ]; then
    echo ""
    echo "Re-run with --yes to actually execute the apt-based install + create the"
    echo "'aviqr' DB/Mongo/RabbitMQ users with the default dev credentials."
    echo "(Each step uses sudo — you'll be prompted for your password.)"
    return 0
  fi

  echo ""
  read -r -p "About to install Java/PostgreSQL/MongoDB/Redis/RabbitMQ/Node with sudo. Continue? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; return 1; }

  sudo apt update
  sudo apt install -y openjdk-21-jdk curl ca-certificates gnupg lsb-release

  # PostgreSQL 17
  sudo install -d /usr/share/postgresql-common/pgdg
  sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
    https://www.postgresql.org/media/keys/ACCC4CF8.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    | sudo tee /etc/apt/sources.list.d/pgdg.list
  sudo apt update && sudo apt install -y postgresql-17
  sudo systemctl enable --now postgresql

  # MongoDB 8.0
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
  sudo apt update && sudo apt install -y mongodb-org
  sudo systemctl enable --now mongod

  # Redis 7.4
  curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" \
    | sudo tee /etc/apt/sources.list.d/redis.list
  sudo apt update && sudo apt install -y redis
  sudo systemctl enable --now redis

  # RabbitMQ 3.13
  sudo apt install -y erlang
  curl -1sLf "https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/setup.deb.sh" | sudo -E bash
  sudo apt update && sudo apt install -y rabbitmq-server
  sudo systemctl enable --now rabbitmq-server
  sudo rabbitmq-plugins enable rabbitmq_management

  # Node.js 20
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs

  echo ""
  ok "System packages installed. Now create the dev users/DBs:"
  echo "    ./aviqr.sh db-setup"
  echo "    sudo rabbitmqctl add_user aviqr aviqr_secret"
  echo "    sudo rabbitmqctl set_user_tags aviqr administrator"
  echo "    sudo rabbitmqctl set_permissions -p / aviqr '.*' '.*' '.*'"
  echo "    mongosh --eval 'db.getSiblingDB(\"admin\").createUser({user:\"aviqr\",pwd:\"aviqr_secret\",roles:[{role:\"root\",db:\"admin\"}]})'"
  echo "    sudo sed -i 's/^# *requirepass.*/requirepass aviqr_redis_secret/' /etc/redis/redis.conf && sudo systemctl restart redis"
}

# ==============================================================================
#  db-setup
# ==============================================================================
cmd_db_setup() {
  if [ ! -f "$BASE/aviqr_setup.sql" ]; then
    err "aviqr_setup.sql not found in $BASE"
    return 1
  fi
  warn "This creates the 'aviqr' role, 10 databases, schema, and demo/bulk data."
  read -r -p "Run aviqr_setup.sql as the postgres superuser now? [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; return 1; }
  sudo -u postgres psql -f - < "$BASE/aviqr_setup.sql"
}

# ==============================================================================
#  build / clean
# ==============================================================================
cmd_build() {
  local target="${1:-all}"
  if [ "$target" = "all" ]; then
    echo "→ Building all services (./gradlew build -x test)..."
    "$BASE/gradlew" build -x test
  else
    if ! is_valid_svc "$target"; then
      err "Unknown service: $target"
      echo "Run './aviqr.sh list' to see valid service names."
      return 1
    fi
    echo "→ Building $target (./gradlew $target:build -x test)..."
    "$BASE/gradlew" "$target:build" -x test
  fi
}

cmd_clean() {
  echo "→ ./gradlew clean"
  "$BASE/gradlew" clean
}

# ==============================================================================
#  run / stop / restart / status / logs
# ==============================================================================
# Pick a working Gradle command once: prefer the wrapper, fall back to system gradle.
_gradle_cmd() {
  if [ -f "$BASE/gradle/wrapper/gradle-wrapper.jar" ] && [ -x "$BASE/gradlew" ]; then
    echo "$BASE/gradlew"
  elif command -v gradle >/dev/null 2>&1; then
    echo "gradle"
  else
    echo ""
  fi
}

start_one() {
  local name="$1"
  local GRADLE; GRADLE=$(_gradle_cmd)
  if [ -z "$GRADLE" ]; then
    err "No Gradle available: wrapper jar is missing AND 'gradle' is not on PATH."
    echo "   Fix either:"
    echo "     • Restore the wrapper jar:  gradle/wrapper/gradle-wrapper.jar"
    echo "     • Or install Gradle:        sudo apt install gradle  (or sdk install gradle 8.10.2)"
    exit 1
  fi
  echo "→ Starting $name..."
  SPRING_PROFILES_ACTIVE=local "$GRADLE" "${name}:bootRun" \
    --no-daemon \
    > "$LOG_DIR/${name}.log" 2>&1 &
  echo $! > "$LOG_DIR/${name}.pid"
}

stop_one() {
  local name="$1"
  local pid_file="$LOG_DIR/${name}.pid"
  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && ok "Stopped $name (pid $pid)"
    else
      warn "$name already stopped"
    fi
    rm -f "$pid_file"
  else
    warn "$name was not started by this script (no pid file)"
  fi
}

cmd_run() {
  local target="${1:-}"
  if [ -z "$target" ]; then
    err "Usage: ./aviqr.sh run all | ./aviqr.sh run <service> [--bg]"
    return 1
  fi

  if [ "$target" = "all" ]; then
    echo "================================================================================"
    echo " AviQR Backend — starting all ${#SERVICES[@]} services in background"
    echo " Logs: $LOG_DIR/"
    echo "================================================================================"

    start_one "service-registry"
    echo "   Waiting for Eureka to be ready (polling, up to 120s)..."
    eureka_up=false
    for i in $(seq 1 40); do
      if curl -s http://localhost:8761/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
        eureka_up=true
        ok "Eureka is up (after ~$((i * 3))s)"
        break
      fi
      # If the process died, stop waiting and show why
      if ! pgrep -f "service-registry" >/dev/null 2>&1; then
        err "service-registry process exited — check $LOG_DIR/service-registry.log"
        echo "   Last 20 log lines:"
        tail -n 20 "$LOG_DIR/service-registry.log" 2>/dev/null | sed 's/^/     /'
        exit 1
      fi
      sleep 3
    done
    if [ "$eureka_up" != "true" ]; then
      err "Eureka did not become healthy within 120s."
      echo "   Check the log: tail -f $LOG_DIR/service-registry.log"
      echo "   Common causes: port 8761 already in use, or a slow first-time JVM warmup."
      echo "   Once it settles you can re-run ./aviqr.sh start."
      exit 1
    fi

    start_one "api-gateway"
    echo "   Waiting for API gateway to be ready (up to 90s)..."
    for i in $(seq 1 30); do
      if curl -s http://localhost:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
        ok "API gateway is up (after ~$((i * 3))s)"
        break
      fi
      sleep 3
    done

    start_one "auth-service"; sleep 8
    start_one "shop-service"; sleep 6
    start_one "menu-service"; sleep 6
    start_one "order-service"; sleep 6
    start_one "payment-service"; sleep 5
    start_one "qr-service"; sleep 5
    start_one "hotel-service"; sleep 5
    start_one "mall-service"; sleep 5
    start_one "support-service"; sleep 5
    start_one "notification-service"; sleep 5
    start_one "report-service"; sleep 5
    start_one "ocr-service"; sleep 3

    echo ""
    echo "================================================================================"
    echo " All ${#SERVICES[@]} services started in background"
    echo "================================================================================"
    echo "  Watch a log:    ./aviqr.sh logs auth-service -f"
    echo "  Status:         ./aviqr.sh status"
    echo "  Stop all:       ./aviqr.sh stop all"
    return 0
  fi

  if ! is_valid_svc "$target"; then
    err "Unknown service: $target"
    echo "Run './aviqr.sh list' to see valid service names."
    return 1
  fi

  if [ "${2:-}" = "--bg" ]; then
    start_one "$target"
    echo "  Log: $LOG_DIR/${target}.log"
  else
    echo "→ Running $target in foreground (Ctrl+C to stop). Use --bg to background it."
    SPRING_PROFILES_ACTIVE=local "$BASE/gradlew" "${target}:bootRun" --no-daemon
  fi
}

cmd_stop() {
  local target="${1:-all}"
  if [ "$target" = "all" ]; then
    echo "Stopping all AviQR services..."
    for svc in "${SERVICES[@]}"; do
      stop_one "$svc"
    done
    pkill -f "aviqr-backend" 2>/dev/null || true
    fuser -k 8761/tcp 2>/dev/null || true
    fuser -k 8080/tcp 2>/dev/null || true
    echo ""
    echo "All services stopped."
  else
    if ! is_valid_svc "$target"; then
      err "Unknown service: $target"
      return 1
    fi
    stop_one "$target"
  fi
}

cmd_restart() {
  local target="${1:-all}"
  cmd_stop "$target"
  sleep 2
  if [ "$target" = "all" ]; then
    cmd_run all
  else
    cmd_run "$target" --bg
  fi
}

cmd_status() {
  echo "================================================================================"
  echo " AviQR Service Status"
  echo "================================================================================"
  for svc in "${SERVICES[@]}"; do
    local pid_file="$LOG_DIR/${svc}.pid"
    if [ -f "$pid_file" ]; then
      local pid
      pid=$(cat "$pid_file")
      if kill -0 "$pid" 2>/dev/null; then
        local started
        started=$(grep -c "Started.*Application\|Tomcat started\|Netty started" "$LOG_DIR/${svc}.log" 2>/dev/null || echo 0)
        if [ "$started" -gt 0 ]; then
          echo "  ✅ $svc (pid $pid) — RUNNING"
        else
          echo "  ⏳ $svc (pid $pid) — STARTING..."
        fi
      else
        echo "  ❌ $svc — DEAD (pid file exists but process gone)"
      fi
    else
      echo "  ⭕ $svc — NOT STARTED"
    fi
  done
  echo ""
  echo "Eureka dashboard: http://localhost:8761"
  echo "Gateway:          http://localhost:8080"
}

cmd_logs() {
  local target="${1:-}"
  if [ -z "$target" ] || ! is_valid_svc "$target"; then
    err "Usage: ./aviqr.sh logs <service> [-f]"
    echo "Run './aviqr.sh list' to see valid service names."
    return 1
  fi
  local log_file="$LOG_DIR/${target}.log"
  if [ ! -f "$log_file" ]; then
    err "No log file yet for $target — has it been started? ($log_file)"
    return 1
  fi
  if [ "${2:-}" = "-f" ]; then
    tail -f "$log_file"
  else
    tail -100 "$log_file"
  fi
}

# ==============================================================================
#  main
# ==============================================================================
main() {
  local cmd="${1:-help}"
  shift || true
  case "$cmd" in
    help|-h|--help) cmd_help ;;
    list)           cmd_list ;;
    check)          cmd_check ;;
    install)        cmd_install "$@" ;;
    db-setup)       cmd_db_setup ;;
    build)          cmd_build "$@" ;;
    clean)          cmd_clean ;;
    run)            cmd_run "$@" ;;
    stop)           cmd_stop "$@" ;;
    restart)        cmd_restart "$@" ;;
    status)         cmd_status ;;
    logs)           cmd_logs "$@" ;;
    *)
      err "Unknown command: $cmd"
      echo ""
      cmd_help
      exit 1
      ;;
  esac
}

main "$@"
