#!/usr/bin/env bash
# AviQR — One-command local development setup
# Usage: chmod +x setup-local.sh && ./setup-local.sh
set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'

echo -e "${GREEN}▶ AviQR Local Setup${RESET}"
echo "========================================"

# Check prerequisites
command -v docker  >/dev/null || { echo "❌ Docker not found. Install from https://docs.docker.com/get-docker/"; exit 1; }
command -v java    >/dev/null || { echo "❌ Java not found. Install JDK 21 from https://adoptium.net"; exit 1; }
command -v node    >/dev/null || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }

JAVA_VER=$(java -version 2>&1 | grep -oP '(?<=version ")[^"]+' | cut -d. -f1)
if [ "${JAVA_VER:-0}" -lt 21 ]; then
  echo "❌ Java 21+ required (found: Java ${JAVA_VER:-unknown})"; exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${RESET}"

# Start infrastructure
echo -e "\n${YELLOW}▶ Starting infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ)...${RESET}"
cd aviqr-backend
docker compose up -d postgres mongo redis rabbitmq
echo "Waiting 30s for databases to initialise..."
sleep 30

# Build backend
echo -e "\n${YELLOW}▶ Building all 14 Spring Boot services...${RESET}"
chmod +x ./gradlew
./gradlew build -x test --parallel --quiet
echo -e "${GREEN}✓ Backend built${RESET}"

# Start all services
echo -e "\n${YELLOW}▶ Starting all microservices...${RESET}"
docker compose up -d
echo "Waiting 60s for services to register in Eureka..."
sleep 60

# Verify
echo -e "\n${YELLOW}▶ Verifying services...${RESET}"
HEALTH=$(curl -s http://localhost:8080/actuator/health 2>/dev/null | grep -o '"status":"UP"' || echo "")
if [ -n "$HEALTH" ]; then
  echo -e "${GREEN}✓ API Gateway is UP${RESET}"
else
  echo -e "${YELLOW}⚠ Gateway not responding yet — wait 30s more and try: curl http://localhost:8080/actuator/health${RESET}"
fi

# Install and start web frontend
cd ../aviqr-ui-web
echo -e "\n${YELLOW}▶ Installing web frontend dependencies...${RESET}"
npm install --silent
echo -e "${GREEN}✓ Dependencies installed${RESET}"

echo ""
echo "========================================"
echo -e "${GREEN}✓ Setup complete!${RESET}"
echo ""
echo "Next steps:"
echo "  1. Start web: cd aviqr-ui-web && npm run dev"
echo "  2. Open: http://localhost:5173"
echo "  3. Register an account (first ADMIN user)"
echo ""
echo "Eureka dashboard: http://localhost:8761"
echo "API Gateway:      http://localhost:8080/actuator/health"
echo "RabbitMQ UI:      http://localhost:15672 (aviqr/aviqr_secret)"
echo ""
