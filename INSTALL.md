# AviQR — Installation & Build Guide

## ⚡ Fastest path (Docker only — no Java/Gradle needed locally)

```bash
cd aviqr-backend

# 1. Start infrastructure
docker compose up -d postgres mongo redis rabbitmq
sleep 20

# 2. Build ALL 14 microservice images (Gradle runs inside Docker)
docker compose build --parallel

# 3. Start everything
docker compose up -d

# 4. Check services registered in Eureka (wait 60s)
open http://localhost:8761

# 5. Start web frontend
cd ../aviqr-ui-web && npm install && npm run dev
# Open http://localhost:5173
```

---

## Standard path (local Java + Gradle)

### Prerequisites
- **Java 21+** — https://adoptium.net/temurin/releases/?version=21
- **Gradle 8+** — Install via SDKMAN (recommended):
  ```bash
  curl -s "https://get.sdkman.io" | bash
  source "$HOME/.sdkman/bin/sdkman-init.sh"
  sdk install gradle 8.10.2
  ```
- **Docker** — https://docs.docker.com/get-docker/
- **Node.js 20+** — https://nodejs.org

### Build and run

```bash
# 1. Infrastructure
cd aviqr-backend
docker compose up -d postgres mongo redis rabbitmq
sleep 20

# 2. Build backend (14 microservices)
./gradlew build -x test --parallel
# First run downloads ~300MB Gradle + deps. Takes 5–10 min.

# 3. Start everything in Docker
docker compose up -d

# 4. Verify (wait 60s for Eureka registration)
curl http://localhost:8080/actuator/health   # → {"status":"UP"}
curl http://localhost:8761                   # → Eureka dashboard

# 5. Web frontend
cd ../aviqr-ui-web && npm install && npm run dev
# → http://localhost:5173
```

---

## Using aviqr.sh (convenience script)

```bash
# Infrastructure
./aviqr.sh infra up              # start postgres/mongo/redis/rabbitmq

# Build
./aviqr.sh build backend         # compile all 14 Spring Boot JARs
./aviqr.sh build web             # build React web (Vite)
./aviqr.sh build all             # both

# OR if no local Java/Gradle:
./aviqr.sh docker-build          # build inside Docker containers

# Start
./aviqr.sh start backend         # docker compose up all services
./aviqr.sh start web             # vite dev server at :5173
./aviqr.sh start mobile          # expo metro bundler

# Status & logs
./aviqr.sh status
./aviqr.sh logs backend          # all services
./aviqr.sh logs backend auth     # only auth-service
./aviqr.sh logs web

# Stop
./aviqr.sh stop all
```

---

## Troubleshooting

### `Error: Could not find or load main class org.gradle.wrapper.GradleWrapperMain`

The `gradlew` script needs Gradle to be downloaded first. Run from the **aviqr-backend** directory:

```bash
cd aviqr-backend
gradle wrapper --gradle-version=8.10.2   # only if system Gradle 7+ is installed
# OR
./aviqr.sh docker-build                  # no local Gradle needed
```

### Services not registering in Eureka

Wait 60 seconds after `docker compose up -d`. Check logs:

```bash
docker logs aviqr-auth -f
docker logs aviqr-shop -f
```

Common causes:
- PostgreSQL not ready → wait for `docker compose ps` to show all healthy
- Wrong env vars → check `aviqr-backend/.env`

### Frontend shows blank page / API errors

```bash
# Check gateway is running
curl http://localhost:8080/actuator/health

# Check VITE_API_URL is set
cat aviqr-ui-web/.env.local   # should have VITE_API_URL=http://localhost:8080
```

### RabbitMQ connection refused

```bash
docker logs aviqr-rabbitmq
# Ensure it's healthy before services start
docker compose up -d rabbitmq && sleep 30 && docker compose up -d
```

---

## Quick verification after startup

```bash
# All services in Eureka:
curl -s http://localhost:8761/eureka/apps | grep -c "<appName>"
# → should be 14

# Register a user:
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Owner","email":"test@aviqr.in","password":"Test@1234","role":"OWNER"}'

# Login:
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@aviqr.in","password":"Test@1234"}'
```
