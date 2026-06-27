#!/bin/bash
# aviqr-tests/run_tests.sh — run the full API automation suite and produce
# both an HTML report and a JUnit XML report.
#
# Usage:
#   ./run_tests.sh                  Run everything against http://localhost:8080
#   ./run_tests.sh -k order         Run only tests matching "order"
#   AVIQR_BASE_URL=http://x ./run_tests.sh   Point at a different gateway

set -uo pipefail

BASE=$(cd "$(dirname "$0")" && pwd)
cd "$BASE"

mkdir -p reports

python3 -m pytest \
  --html=reports/report.html --self-contained-html \
  --junitxml=reports/junit.xml \
  "$@"
status=$?

echo ""
echo "HTML report: $BASE/reports/report.html"
echo "JUnit XML:   $BASE/reports/junit.xml"
exit $status
