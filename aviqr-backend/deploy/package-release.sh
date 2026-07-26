#!/bin/bash
# ==============================================================================
#  package-release.sh — runs on the Jenkins agent, after the Build & Test stage
#  has already produced build/libs/*.jar for every backend service.
#
#  Collects those jars plus two web builds (one per target API URL) into a
#  single tarball, so staging and production later deploy the *exact same*
#  backend bytes. Only the web bundle differs between environments, because
#  Vite inlines VITE_API_URL at build time — see JENKINS_PIPELINE.md for why
#  that's an accepted exception to "build once".
#
#  Usage: package-release.sh <release-id> <staging-api-url> <production-api-url>
#  Must run from the repo root (Jenkinsfile's WORKSPACE).
# ==============================================================================
set -euo pipefail

RELEASE_ID="${1:?Usage: package-release.sh <release-id> <staging-api-url> <production-api-url>}"
STAGING_API_URL="${2:?missing staging api url}"
PRODUCTION_API_URL="${3:?missing production api url}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE_DIR="$ROOT_DIR/.release/$RELEASE_ID"
BACKEND_DIR="$ROOT_DIR/aviqr-backend"
WEB_DIR="$ROOT_DIR/aviqr-ui-web"

# Mirrors deploy.sh's SERVICES array — keep both in sync.
SERVICES=(
  service-registry api-gateway auth-service shop-mall-service menu-ocr-service
  order-qr-service payment-service hotel-service
  support-service notification-report-review-service
)

echo "Packaging release $RELEASE_ID into $STAGE_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/backend" "$STAGE_DIR/web"

for svc in "${SERVICES[@]}"; do
  jar=$(find "$BACKEND_DIR/$svc/build/libs" -maxdepth 1 -name "*.jar" ! -name "*-plain.jar" | head -1)
  if [ -z "$jar" ]; then
    echo "ERROR: no boot jar found for $svc — did the Build & Test stage run first?" >&2
    exit 1
  fi
  cp "$jar" "$STAGE_DIR/backend/${svc}.jar"
done

echo "Building web bundle for staging ($STAGING_API_URL)..."
(cd "$WEB_DIR" && VITE_API_URL="$STAGING_API_URL" npx vite build --outDir "$STAGE_DIR/web/dist-staging" --emptyOutDir)

echo "Building web bundle for production ($PRODUCTION_API_URL)..."
(cd "$WEB_DIR" && VITE_API_URL="$PRODUCTION_API_URL" npx vite build --outDir "$STAGE_DIR/web/dist-production" --emptyOutDir)

cat > "$STAGE_DIR/manifest.txt" <<EOF
release_id=$RELEASE_ID
git_sha=$(git -C "$ROOT_DIR" rev-parse HEAD)
git_branch=$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD)
built_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
EOF

tar -C "$ROOT_DIR/.release" -czf "$ROOT_DIR/release-${RELEASE_ID}.tar.gz" "$RELEASE_ID"
echo "Created $ROOT_DIR/release-${RELEASE_ID}.tar.gz"
