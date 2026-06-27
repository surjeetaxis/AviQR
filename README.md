# AviQR

AviQR is a multi-tenant SaaS platform for QR-code ordering and operations
across restaurants, hotels, and malls. It has three deployable apps that
share a common backend:

| App | Path | Stack | What it's for |
|---|---|---|---|
| **Backend** | [`aviqr-backend/`](./aviqr-backend) | Java 21, Spring Boot 3.3, Spring Cloud 2023 | 14 microservices: auth, shop, menu, order, payment, QR, hotel, mall, support, notification, report, OCR, plus Eureka + gateway |
| **Web dashboard** | [`aviqr-ui-web/`](./aviqr-ui-web) | React 18 + Vite | Owner/admin/hotel/mall/support dashboards (login, menu, orders, staff, settings, reports) |
| **Mobile app** | [`aviqr-mobile-expo/`](./aviqr-mobile-expo) | React Native + Expo Router | Role-based mobile app: customer ordering + owner/admin/hotel/mall/supplier/support apps, one codebase routed by role |

A helper script at the repo root, **`./aviqr.sh`**, builds/starts/stops the
backend and web dashboard together or individually. The mobile app is
deployed independently via its own script — see
[Mobile app (separate deployment)](#mobile-app-separate-deployment) below.
The backend additionally has its own more detailed `aviqr-backend/aviqr.sh`
for per-microservice control — see
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
| Expo CLI (`npx expo`) / EAS CLI (`npx eas-cli`) | via `npx`, no global install needed | Running/building the mobile app (Metro bundler, cloud builds) |
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
cd aviqr-backend && ./aviqr.sh db-setup      # seed: schema + dummy data for every feature
cd aviqr-backend && ./aviqr.sh db-teardown   # unseed: drop all 11 databases to start over
```

### 3. Web dependencies

```bash
cd aviqr-ui-web && npm install
```

(`./aviqr.sh build` below also runs `npm install` for you.)

Mobile dependencies are installed by its own script — see
[Mobile app (separate deployment)](#mobile-app-separate-deployment).

---

## Build

```bash
./aviqr.sh build              # backend + web
./aviqr.sh build backend      # ./gradlew build -x test (all 14 services)
./aviqr.sh build web          # npm install && vite build
```

For per-microservice backend builds, use the backend's own script:

```bash
cd aviqr-backend && ./aviqr.sh build auth-service
```

For mobile builds (JS bundle check, or cloud native builds), see
[Mobile app (separate deployment)](#mobile-app-separate-deployment).

---

## Run

```bash
./aviqr.sh start              # backend (14 services) + web (Vite)
./aviqr.sh start backend      # delegates to aviqr-backend/start-all.sh
./aviqr.sh start web          # Vite dev server → http://localhost:5173
```

```bash
./aviqr.sh status             # backend service status + web process status
./aviqr.sh logs               # tail -f everything
./aviqr.sh logs backend       # tail -f aviqr-backend/logs/*.log
./aviqr.sh logs web           # tail -f web dev server log
./aviqr.sh stop               # stop everything
./aviqr.sh stop backend|web
./aviqr.sh restart [backend|web|all]
```

For per-microservice backend control (run one service, follow its log,
restart just that one), use `aviqr-backend/aviqr.sh` — see
[`aviqr-backend/README.md`](./aviqr-backend/README.md) for its full
command reference (`check`, `install`, `db-setup`, `db-teardown`, `build <service>`,
`run <service> [--bg]`, `logs <service> -f`, etc.).

To run or deploy the mobile app, use its own script — see the next section.

---

## Full command reference (root `aviqr.sh`)

```
./aviqr.sh build   [backend|web|all]   # default: all
./aviqr.sh start   [backend|web|all]
./aviqr.sh stop    [backend|web|all]
./aviqr.sh restart [backend|web|all]
./aviqr.sh status
./aviqr.sh logs    [backend|web|all]   # tail -f
```

Backend start/stop/status delegate to `aviqr-backend/{start-all,stop-all,status}.sh`,
which start `service-registry` first (everything needs Eureka) and then the
other 14 services in small batches (4 at a time by default — set
`AVIQR_START_BATCH_SIZE` to change it), polling each batch until it
registers before starting the next. This script adds equivalent process
management for the web (Vite) dev server, with PID/log files in `logs/` at
the repo root. It does not manage the mobile app — see below.

---

## Mobile app (separate deployment)

The mobile app (`aviqr-mobile-expo/`) has its own script,
**`aviqr-mobile-expo/aviqr-mobile.sh`**, independent of the root `aviqr.sh`.
It handles local dev (Metro/Expo) as well as cloud native builds/OTA
updates via `eas-cli` (no global install needed — runs through `npx`).

```bash
cd aviqr-mobile-expo

./aviqr-mobile.sh install                          # npm install
./aviqr-mobile.sh bundle                           # sanity-check JS bundle (expo export, web)
./aviqr-mobile.sh start                            # Expo dev server (foreground) — scan QR or press w/a/i
./aviqr-mobile.sh start --bg                       # same, backgrounded with PID/log in aviqr-mobile-expo/logs/
./aviqr-mobile.sh status                           # dev server running/stopped
./aviqr-mobile.sh logs -f                          # follow dev server log
./aviqr-mobile.sh stop                              # stop background dev server

./aviqr-mobile.sh deploy android --profile preview     # EAS cloud build (Android)
./aviqr-mobile.sh deploy ios --profile production       # EAS cloud build (iOS)
./aviqr-mobile.sh deploy all --profile production        # both platforms
./aviqr-mobile.sh submit android                        # submit latest build to Play Store
./aviqr-mobile.sh update --branch production --message "fix order screen crash"  # OTA JS update
```

`deploy`/`submit`/`update` require `eas login` once and a configured
`eas.json` (`npx eas-cli build:configure` generates one on first use).
Run `./aviqr-mobile.sh help` for the full command reference.

---

## Useful URLs (once running)

- Eureka dashboard: http://localhost:8761
- API Gateway: http://localhost:8080
- Web dashboard: http://localhost:5173
- RabbitMQ management UI: http://localhost:15672 (`aviqr` / `aviqr_secret`)

---

## Marketplace Platform Requirements

### Seller Tier System

Sellers are categorized into:
- Gold Seller
- Silver Seller
- Bronze Seller
- New Seller

Tier calculation based on:
- Customer ratings
- Order completion rate
- Delivery performance
- Sales volume
- Return percentage
- Customer satisfaction score

Higher-tier sellers receive better visibility in search results, category
pages, and featured sections.

### Product Ranking Engine

Product visibility score should be calculated using:
- Product rating
- Seller rating
- SEO score
- Conversion rate
- Sales volume
- Seller tier
- Customer engagement

### SEO Requirements

- SEO-friendly URLs
- Dynamic sitemap generation
- Structured schema markup
- Open Graph tags
- Canonical URLs
- Product SEO score
- Category SEO optimization
- Seller profile SEO

### AI Features

- AI product recommendations
- AI product descriptions
- AI SEO optimization
- AI chatbot support
- AI demand forecasting

### Dashboard Requirements

**Seller Dashboard:**
- Revenue
- Orders
- Products
- Inventory
- Reviews
- SEO Score
- Analytics

**Customer Dashboard:**
- Orders
- Wishlist
- Addresses
- Reviews

### Scalability & Pagination

The platform must support enterprise-scale pagination across all modules to
handle millions of records efficiently.

Implement server-side pagination for:
- Products
- Sellers
- Orders
- Customers
- Reviews
- Reports

Support page size options: 10, 20, 50, and 100 records per page, with
sorting, filtering, and search support.

All APIs must return paginated responses by default for high performance
and scalability.