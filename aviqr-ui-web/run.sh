#!/bin/bash
# ==============================================================================
#  run.sh — start (or build) the AviQR web UI on its own
#
#  Usage:
#    ./run.sh              Install deps (if needed) + start the Vite dev server
#    ./run.sh build        Production build → dist/
#    ./run.sh preview      Preview the production build
# ==============================================================================

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
cd "$BASE"

ok()   { echo "  ✅ $*"; }
err()  { echo "  ❌ $*"; }

if ! command -v node >/dev/null 2>&1; then
  err "Node.js not found. Install Node 20+: https://nodejs.org (or 'brew install node@20' on Mac)"
  exit 1
fi

install_deps() {
  if [ ! -d "$BASE/node_modules" ]; then
    echo "→ Installing npm packages..."
    npm install
  fi
}

cmd="${1:-dev}"
case "$cmd" in
  dev|start|"")
    install_deps
    echo "→ Starting Vite dev server (http://localhost:5173)..."
    npm run dev
    ;;
  build)
    install_deps
    echo "→ Building production bundle..."
    npm run build
    ok "Build complete → dist/"
    ;;
  preview)
    npm run preview
    ;;
  *)
    err "Unknown command: $cmd"
    echo "Usage: ./run.sh [dev|build|preview]"
    exit 1
    ;;
esac
