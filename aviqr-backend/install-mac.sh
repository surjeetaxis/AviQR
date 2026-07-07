#!/bin/bash
# ==============================================================================
#  install-mac.sh — Homebrew-based native install for AviQR backend (macOS)
#
#  Installs: Java 21, PostgreSQL 17, MongoDB 8.0, Redis 7.4, RabbitMQ 3.13,
#  Node.js 20+ — then creates the 'aviqr' Postgres user/DBs, Mongo admin user,
#  Redis password, and RabbitMQ user, matching the credentials DEPLOYMENT_NO_DOCKER.md
#  and aviqr_setup.sql expect.
#
#  Usage:
#    ./install-mac.sh              Show what would be installed (dry run)
#    ./install-mac.sh --yes        Actually run brew installs + create users/DBs
#
#  Safe to re-run: brew installs are no-ops if already present, and the DB/user
#  creation steps are idempotent (aviqr_setup.sql; IF NOT EXISTS elsewhere).
# ==============================================================================

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
AUTO=false
[ "${1:-}" = "--yes" ] && AUTO=true

ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
err()  { echo "  ❌ $*"; }

if [ "$(uname -s)" != "Darwin" ]; then
  err "This script is for macOS only. On Linux, use: ./aviqr.sh install --yes"
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  cat <<'EOF'
Homebrew is not installed. Install it first:

  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

Then re-run this script.
EOF
  exit 1
fi

BREW_PREFIX=$(brew --prefix)
SHELL_RC="$HOME/.zshrc"
[ -n "${BASH_VERSION:-}" ] && [ -f "$HOME/.bash_profile" ] && SHELL_RC="$HOME/.bash_profile"

cat <<EOF
================================================================================
 Required software (macOS, Homebrew)
================================================================================
  Java 21 (JDK)      — brew install openjdk@21
  PostgreSQL 17       — brew install postgresql@17
  MongoDB 8.0          — brew tap mongodb/brew && brew install mongodb-community@8.0
  Redis 7.4             — brew install redis
  RabbitMQ 3.13       — brew install rabbitmq
  Node.js 20+ (frontend only) — brew install node@20

Each service is started with 'brew services start', so it survives reboots.
Full manual walkthrough: DEPLOYMENT_NO_DOCKER.md
EOF

if [ "$AUTO" != true ]; then
  echo ""
  echo "Re-run with --yes to actually install everything via Homebrew and create"
  echo "the 'aviqr' DB/Mongo/RabbitMQ users + Redis password with dev credentials."
  exit 0
fi

echo ""
read -r -p "About to install Java/PostgreSQL/MongoDB/Redis/RabbitMQ/Node via Homebrew. Continue? [y/N] " reply
[[ "$reply" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }

brew update

# ── Java 21 ───────────────────────────────────────────────────────────────
brew install openjdk@21
if ! grep -q 'openjdk@21/bin' "$SHELL_RC" 2>/dev/null; then
  echo "export PATH=\"$BREW_PREFIX/opt/openjdk@21/bin:\$PATH\"" >> "$SHELL_RC"
fi
export PATH="$BREW_PREFIX/opt/openjdk@21/bin:$PATH"

# ── PostgreSQL 17 ─────────────────────────────────────────────────────────
brew install postgresql@17
brew services start postgresql@17
if ! grep -q 'postgresql@17/bin' "$SHELL_RC" 2>/dev/null; then
  echo "export PATH=\"$BREW_PREFIX/opt/postgresql@17/bin:\$PATH\"" >> "$SHELL_RC"
fi
export PATH="$BREW_PREFIX/opt/postgresql@17/bin:$PATH"
echo "   Waiting for PostgreSQL to accept connections..."
for i in $(seq 1 20); do
  pg_isready >/dev/null 2>&1 && break
  sleep 1
done

# ── MongoDB 8.0 ───────────────────────────────────────────────────────────
brew tap mongodb/brew
brew trust mongodb/brew >/dev/null 2>&1 || true
brew install mongodb-community@8.0
brew install mongosh
brew services start mongodb-community@8.0

# ── Redis 7.4 ─────────────────────────────────────────────────────────────
brew install redis
brew services start redis

# ── RabbitMQ 3.13 ─────────────────────────────────────────────────────────
brew install rabbitmq
brew services start rabbitmq
if ! grep -q 'rabbitmq/sbin' "$SHELL_RC" 2>/dev/null; then
  echo "export PATH=\"$BREW_PREFIX/opt/rabbitmq/sbin:\$PATH\"" >> "$SHELL_RC"
fi
export PATH="$BREW_PREFIX/opt/rabbitmq/sbin:$PATH"
echo "   Waiting for RabbitMQ to come up..."
for i in $(seq 1 20); do
  "$BREW_PREFIX/opt/rabbitmq/sbin/rabbitmqctl" status >/dev/null 2>&1 && break
  sleep 2
done

# ── Node.js 20 ────────────────────────────────────────────────────────────
brew install node@20
if ! grep -q 'node@20/bin' "$SHELL_RC" 2>/dev/null; then
  echo "export PATH=\"$BREW_PREFIX/opt/node@20/bin:\$PATH\"" >> "$SHELL_RC"
fi
export PATH="$BREW_PREFIX/opt/node@20/bin:$PATH"

echo ""
echo "================================================================================"
echo " Creating dev users/DBs (idempotent — safe to re-run)"
echo "================================================================================"

# PostgreSQL: on Homebrew, the current OS user is the superuser (no 'postgres'
# system user like on Linux), and aviqr_setup.sql already creates the 'aviqr'
# role + all databases, so run it directly.
if [ -f "$BASE/aviqr_setup.sql" ]; then
  psql postgres -f "$BASE/aviqr_setup.sql" && ok "PostgreSQL: aviqr role + databases created"
else
  warn "aviqr_setup.sql not found in $BASE — skipping DB setup"
fi

# MongoDB admin user
mongosh --quiet --eval '
db.getSiblingDB("admin").createUser({
  user: "aviqr",
  pwd: "aviqr_secret",
  roles: [{ role: "root", db: "admin" }]
})
' >/dev/null 2>&1 && ok "MongoDB: aviqr admin user created" || warn "MongoDB: aviqr user may already exist"

# RabbitMQ user + management plugin
"$BREW_PREFIX/opt/rabbitmq/sbin/rabbitmq-plugins" enable rabbitmq_management >/dev/null 2>&1
"$BREW_PREFIX/opt/rabbitmq/sbin/rabbitmqctl" add_user aviqr aviqr_secret >/dev/null 2>&1 && ok "RabbitMQ: aviqr user created" || warn "RabbitMQ: aviqr user may already exist"
"$BREW_PREFIX/opt/rabbitmq/sbin/rabbitmqctl" set_user_tags aviqr administrator >/dev/null 2>&1
"$BREW_PREFIX/opt/rabbitmq/sbin/rabbitmqctl" set_permissions -p / aviqr '.*' '.*' '.*' >/dev/null 2>&1

# Redis password
REDIS_CONF="$BREW_PREFIX/etc/redis.conf"
if [ -f "$REDIS_CONF" ] && ! grep -q '^requirepass aviqr_redis_secret' "$REDIS_CONF"; then
  echo "requirepass aviqr_redis_secret" >> "$REDIS_CONF"
  brew services restart redis
  ok "Redis: password set (aviqr_redis_secret)"
else
  warn "Redis: config not found at $REDIS_CONF or password already set — set it manually if needed"
fi

echo ""
echo "================================================================================"
ok "Done. Open a new terminal (or 'source $SHELL_RC') to pick up PATH changes."
echo "================================================================================"
echo "  Verify everything:  ./aviqr.sh check"
echo "  Start the backend:  ./aviqr.sh run all"
echo "  RabbitMQ UI:        http://localhost:15672  (aviqr / aviqr_secret)"
