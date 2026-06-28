#!/usr/bin/env bash
# AviQR — Full QA Test Runner
# Usage: ./run_qa.sh [marker]   e.g. ./run_qa.sh smoke
set -e

cd "$(dirname "$0")"

echo "════════════════════════════════════════════════════════"
echo "  AviQR Full QA Suite"
echo "  Target: ${AVIQR_BASE_URL:-http://localhost:8080}"
echo "════════════════════════════════════════════════════════"

# 1. Check backend is reachable before running anything
echo ""
echo "→ Checking backend health…"
if ! curl -sf "${AVIQR_EUREKA_URL:-http://localhost:8761}/actuator/health" >/dev/null 2>&1; then
  echo "  ⚠ Eureka not reachable — start the backend first (./aviqr.sh start)"
  echo "  Running tests anyway; expect connection failures."
fi

# 2. Install deps if needed
pip install -q -r requirements.txt 2>/dev/null || true

# 3. Run by phase
MARKER="${1:-}"
HTML_REPORT="qa_report_$(date +%Y%m%d_%H%M%S).html"

if [ -n "$MARKER" ]; then
  echo "→ Running tests marked: $MARKER"
  pytest -m "$MARKER" --html="$HTML_REPORT" --self-contained-html
else
  echo "→ Phase 1: Smoke tests (fail fast)…"
  pytest -m smoke --tb=short -q || { echo "✗ Smoke tests failed — backend may be down. Stopping."; exit 1; }

  echo ""
  echo "→ Phase 2: Full suite…"
  pytest --html="$HTML_REPORT" --self-contained-html
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Report: $HTML_REPORT"
echo "════════════════════════════════════════════════════════"
