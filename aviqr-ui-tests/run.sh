#!/usr/bin/env bash
# ─── AviQR UI Automation Runner ───────────────────────────────────────────────
#
#  USAGE:
#    ./run.sh                   Run all tests headless (full suite)
#    ./run.sh headed            Run in visible browser (see it happen live)
#    ./run.sh public            Run only public-page tests
#    ./run.sh owner             Run only owner/manager/cashier/kitchen tests
#    ./run.sh admin             Run only admin tests
#    ./run.sh support           Run only support tests
#    ./run.sh hotel             Run only hotel tests
#    ./run.sh mall              Run only mall tests
#    ./run.sh supplier          Run only supplier tests
#    ./run.sh validate          Run cross-cutting validation tests
#    ./run.sh report            Open the HTML report in browser
#
#  ENVIRONMENT:
#    UI_URL=http://localhost:5173  (default)
#    API_URL=http://localhost:8080 (default)
#
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

# Install once
if [ ! -d node_modules ]; then
  echo "→ Installing Playwright…"
  npm install
  npx playwright install chromium
fi

mkdir -p screenshots

MODE="${1:-}"

run_test() {
  local spec="$1"
  local headed="${2:-}"
  if [ -n "$headed" ]; then
    npx playwright test "$spec" --headed --workers=1
  else
    npx playwright test "$spec" --workers=1
  fi
}

case "$MODE" in
  headed)
    npx playwright test --headed --workers=1
    ;;
  public)
    run_test "tests/01_public.spec.js" "headed"
    ;;
  owner)
    run_test "tests/02_owner.spec.js" "headed"
    ;;
  admin)
    run_test "tests/03_admin.spec.js" "headed"
    ;;
  support)
    run_test "tests/04_support.spec.js" "headed"
    ;;
  hotel)
    run_test "tests/05_hotel.spec.js" "headed"
    ;;
  mall)
    run_test "tests/06_mall.spec.js" "headed"
    ;;
  supplier)
    run_test "tests/07_supplier.spec.js" "headed"
    ;;
  validate)
    run_test "tests/08_validation.spec.js" "headed"
    ;;
  report)
    npx playwright show-report
    exit 0
    ;;
  "")
    npx playwright test --workers=1
    ;;
  *)
    echo "Unknown option: $MODE"
    echo "Run ./run.sh --help for usage"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Done!  To view the HTML report run:"
echo "    cd aviqr-ui-tests && ./run.sh report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
