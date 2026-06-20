# AviQR

AviQR is a multi-tenant SaaS platform for QR-code ordering and operations
across restaurants, hotels, and malls. It has three deployable apps that
share a common backend:

| App | Path | Stack | What it's for |
|---|---|---|---|
| **Backend** | [`aviqr-backend/`](./aviqr-backend) | Java 21, Spring Boot 3.3, Spring Cloud 2023 | 14 microservices: auth, shop, menu, order, payment, QR, hotel, mall, support, notification, report, OCR, plus Eureka + gateway |
| **Web dashboard** | [`aviqr-ui-web/`](./aviqr-ui-web) | React 18 + Vite | Owner/admin/hotel/mall/support dashboards (login, menu, orders, staff, settings, reports) |
| **Mobile app** | [`aviqr-mobile-expo/`](./aviqr-mobile-expo) | React Native + Expo Router | Role-based mobile app: customer ordering + owner/admin/hotel/mall/supplier/support apps, one codebase routed by role |

A single helper script at the repo root, **`./aviqr.sh`**, builds/starts/stops
all three together or individually. The backend additionally has its own
more detailed `aviqr-backend/aviqr.sh` for per-microservice control — see
[`aviqr-backend/README.md`](./aviqr-backend/README.md).

Other docs in this repo:
- [`AVIQR_DEPLOYMENT_GUIDE.md`](./AVIQR_DEPLOYMENT_GUIDE.md) — full local + live-server deployment guide (Docker and native)
- [`aviqr-backend/DEPLOYMENT_NO_DOCKER.md`](./aviqr-backend/DEPLOYMENT_NO_DOCKER.md) — native (no Docker) install steps per OS
- [`aviqr-backend/API_REFERENCE.md`](./aviqr-backend/API_REFERENCE.md) — backend API reference
- `AviQR OS PRD.docx` — product requirements
- `files/` — pitch decks / investor materials (not code)

---

## Architecture at a glance

```
   aviqr-mobile-expo  ─┐
                        ├──►  api-gateway (8080)  ──►  14 backend microservices
   aviqr-ui-web        ─┘            │
                                      ▼
                          service-registry / Eureka (8761)

   Storage: PostgreSQL (1 DB per service) · MongoDB (audit/logs)
            Redis (gateway rate limiting) · RabbitMQ (async events)
```

Both frontends talk to the backend only through the API Gateway
(`http://localhost:8080`), which validates JWTs and forwards identity
downstream. See `aviqr-backend/README.md` for the full service table.

---

## Required software

| Software | Version | Needed for |
|---|---|---|
| Java (JDK) | 21 | Backend (14 services) |
| Gradle | bundled (`aviqr-backend/gradlew`) | Backend build |
| PostgreSQL | 17 | Backend storage |
| MongoDB | 8.0 | Backend audit/log storage |
| Redis | 7.4 | Backend gateway rate limiting |
| RabbitMQ | 3.13 | Backend async messaging |
| Node.js | 20+ | Web dashboard + mobile app |
| npm | bundled with Node | Installing web/mobile dependencies |
| Expo CLI (`npx expo`) | via `npx`, no global install needed | Running the mobile app (Metro bundler) |
| Docker + Docker Compose | optional | Alternative to native infra install (`aviqr-backend/docker-compose.yml`) |

Check what's installed for the backend specifically:

```bash
cd aviqr-backend && ./aviqr.sh check
```

---

## Installation

### 1. Backend infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ, Java)

Two options — pick one:

```bash
# Option A — Docker (fastest)
cd aviqr-backend && make up-infra

# Option B — native install (Ubuntu/Debian)
cd aviqr-backend && ./aviqr.sh install --yes
```

For macOS/Windows or a fully manual walkthrough, follow
`aviqr-backend/DEPLOYMENT_NO_DOCKER.md` or `AVIQR_DEPLOYMENT_GUIDE.md`.

### 2. Database schema + demo data

```bash
cd aviqr-backend && ./aviqr.sh db-setup
```

### 3. Web + mobile dependencies

```bash
cd aviqr-ui-web && npm install
cd aviqr-mobile-expo && npm install
```

(`./aviqr.sh build` below also runs `npm install` for you.)

---

## Build

```bash
./aviqr.sh build              # backend + web + mobile
./aviqr.sh build backend      # ./gradlew build -x test (all 14 services)
./aviqr.sh build web          # npm install && vite build
./aviqr.sh build mobile       # npm install && expo export --platform web (bundle check)
```

For per-microservice backend builds, use the backend's own script:

```bash
cd aviqr-backend && ./aviqr.sh build auth-service
```

---

## Run

```bash
./aviqr.sh start              # backend (14 services) + web (Vite) + mobile (Expo)
./aviqr.sh start backend      # delegates to aviqr-backend/start-all.sh
./aviqr.sh start web          # Vite dev server → http://localhost:5173
./aviqr.sh start mobile       # Expo/Metro bundler (scan QR with Expo Go, or press w/a/i)
```

```bash
./aviqr.sh status             # backend service status + web/mobile process status
./aviqr.sh logs               # tail -f everything
./aviqr.sh logs backend       # tail -f aviqr-backend/logs/*.log
./aviqr.sh logs web           # tail -f web dev server log
./aviqr.sh logs mobile        # tail -f mobile/Metro log
./aviqr.sh stop               # stop everything
./aviqr.sh stop backend|web|mobile
./aviqr.sh restart [backend|web|mobile|all]
```

For per-microservice backend control (run one service, follow its log,
restart just that one), use `aviqr-backend/aviqr.sh` — see
[`aviqr-backend/README.md`](./aviqr-backend/README.md) for its full
command reference (`check`, `install`, `db-setup`, `build <service>`,
`run <service> [--bg]`, `logs <service> -f`, etc.).

---

## Full command reference (root `aviqr.sh`)

```
./aviqr.sh build   [backend|web|mobile|all]   # default: all
./aviqr.sh start   [backend|web|mobile|all]
./aviqr.sh stop    [backend|web|mobile|all]
./aviqr.sh restart [backend|web|mobile|all]
./aviqr.sh status
./aviqr.sh logs    [backend|web|mobile|all]   # tail -f
```

Backend start/stop/status delegate to `aviqr-backend/{start-all,stop-all,status}.sh`,
which know the correct boot order for the 14 services (registry → gateway →
auth → business services). This script adds equivalent process management
for the web (Vite) and mobile (Expo) dev servers, with PID/log files in
`logs/` at the repo root.

---

## Useful URLs (once running)

- Eureka dashboard: http://localhost:8761
- API Gateway: http://localhost:8080
- Web dashboard: http://localhost:5173
- RabbitMQ management UI: http://localhost:15672 (`aviqr` / `aviqr_secret`)