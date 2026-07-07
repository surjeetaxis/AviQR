# AviQR Backend

Microservices backend for the AviQR platform — QR-code ordering for
restaurants, hotels, and malls. Built with **Java 21**, **Spring Boot 3.3**,
and **Spring Cloud 2023** (Eureka service discovery + Spring Cloud Gateway).

All business services are independently deployable, register themselves with
Eureka, and are reachable only through the API Gateway, which validates JWTs
and forwards identity to downstream services via `X-User-Id` / `X-User-Role`
headers.

A single helper script, **`./aviqr.sh`**, wraps every build/run/check
operation described below — run `./aviqr.sh help` at any time.

---

## Services

| Service | Port | Description |
|---|---|---|
| `service-registry` | 8761 | Eureka service discovery — every other service registers here |
| `api-gateway` | 8080 | Spring Cloud Gateway — routing, JWT validation, CORS, rate limiting |
| `auth-service` | dynamic* | Register/login, OTP login, JWT issue/refresh, profile, admin user management |
| `shop-mall-service` | dynamic* | Shop/restaurant profile, staff, settings, mall + vendor management |
| `menu-ocr-service` | dynamic* | Menu items, categories, dynamic pricing rules, OCR menu import |
| `order-qr-service` | dynamic* | Order lifecycle: create, accept, prepare, complete; QR generation + scan logging |
| `payment-service` | dynamic* | Razorpay payment orders + webhook verification |
| `hotel-service` | dynamic* | Hotel, room, and room-service request management |
| `support-service` | dynamic* | Support tickets, audit logs, admin impersonation logs |
| `notification-report-service` | dynamic* | SMS/Email notifications, consumes RabbitMQ events; reports and analytics |

\* picks a random free port and registers it with Eureka; the gateway routes
to it by service name, so you never call these ports directly.

**Storage:** PostgreSQL (one database per service), MongoDB (audit/logs),
Redis (gateway rate limiting), RabbitMQ (async notifications/order events).

---

## Required software

| Software | Version | Used for |
|---|---|---|
| Java (JDK) | 21 | Compiling/running every service |
| Gradle | bundled (`./gradlew`) | Build tool — no separate install needed |
| PostgreSQL | 17 | Primary relational store (10 databases) |
| MongoDB | 8.0 | Audit/log storage |
| Redis | 7.4 | Gateway rate limiting, caching |
| RabbitMQ | 3.13 | Async messaging (notifications, order events) |
| Node.js | 20+ | Only needed for the `aviqr-ui-web` frontend dev server |

Check what's installed and what's missing:

```bash
./aviqr.sh check
```

---

## Installation

For Ubuntu/Debian or macOS, the script can print the exact install commands,
or run them for you:

```bash
./aviqr.sh install            # print the commands
./aviqr.sh install --yes      # actually install Java/Postgres/Mongo/Redis/RabbitMQ/Node
                               # (macOS: Homebrew via install-mac.sh; Linux: apt, uses sudo)
```

For Windows, or a fully manual walkthrough, follow
[`DEPLOYMENT_NO_DOCKER.md`](./DEPLOYMENT_NO_DOCKER.md) step by step — it has
exact commands per OS, including creating the `aviqr` Postgres role, Mongo
user, and RabbitMQ user/permissions.

### Database setup

Once Postgres is running, create the 10 databases, schema, and demo data:

```bash
./aviqr.sh db-setup
```

This runs [`aviqr_setup.sql`](./aviqr_setup.sql) as the `postgres` superuser
(prompts for confirmation first, since it creates roles/databases).

---

## Build

```bash
./aviqr.sh build                  # build all 11 services
./aviqr.sh build auth-service     # build just one
./aviqr.sh clean                  # ./gradlew clean
```

---

## Run

```bash
./aviqr.sh run all                # start everything in the background
./aviqr.sh run auth-service       # run one service in the foreground (Ctrl+C to stop)
./aviqr.sh run auth-service --bg  # run one service in the background
```

`run all` starts services in dependency order (registry → gateway → auth →
business services), pausing between each so Eureka registration completes
before the next one starts.

```bash
./aviqr.sh status                 # who's running, who isn't
./aviqr.sh logs auth-service -f   # follow a service's log
./aviqr.sh stop all               # stop everything started by this script
./aviqr.sh stop auth-service      # stop just one
./aviqr.sh restart all            # stop + run all
```

Logs and PID files live in `logs/<service>.log` / `logs/<service>.pid`.

---

## Useful URLs (once running)

- Eureka dashboard: http://localhost:8761
- API Gateway: http://localhost:8080
- RabbitMQ management UI: http://localhost:15672 (`aviqr` / `aviqr_secret`)

---

## Full command reference

```
./aviqr.sh help                      Show usage
./aviqr.sh list                      List all services (port + description)
./aviqr.sh check                     Check required software + infra status
./aviqr.sh install [--yes]           Show (or run, with --yes) install commands
./aviqr.sh db-setup                  Run aviqr_setup.sql against local Postgres
./aviqr.sh build [all|<service>]     Build all services, or just one
./aviqr.sh clean                     ./gradlew clean
./aviqr.sh run all                   Start every service in the background
./aviqr.sh run <service> [--bg]      Start one service (foreground by default)
./aviqr.sh stop [all|<service>]      Stop service(s) started by this script
./aviqr.sh restart [all|<service>]   stop + run
./aviqr.sh status                    Show running/stopped state of everything
./aviqr.sh logs <service> [-f]       Show (or follow) a service's log file
```

For deeper detail, see `DEPLOYMENT_NO_DOCKER.md`, `DEPLOYMENT.md`, and
`API_REFERENCE.md`.
