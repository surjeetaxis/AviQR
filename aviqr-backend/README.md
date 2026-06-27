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
| `shop-service` | dynamic* | Shop/restaurant profile, staff, settings |
| `menu-service` | dynamic* | Menu items, categories, dynamic pricing rules |
| `order-service` | dynamic* | Order lifecycle: create, accept, prepare, complete |
| `payment-service` | dynamic* | Razorpay payment orders + webhook verification |
| `qr-service` | dynamic* | QR code generation + scan logging |
| `hotel-service` | dynamic* | Hotel, room, and room-service request management |
| `mall-service` | dynamic* | Mall and vendor management |
| `support-service` | dynamic* | Support tickets, audit logs, admin impersonation logs |
| `notification-service` | dynamic* | SMS/Email notifications, consumes RabbitMQ events |
| `report-service` | dynamic* | Reports and analytics |
| `ocr-service` | dynamic* | OCR via Google Vision API |

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
| PostgreSQL | 17 | Primary relational store (11 databases) |
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

### Option A — Docker (fastest)

```bash
make up           # postgres, mongo, redis, rabbitmq + all services
make up-infra      # just the infra containers, if you want to run services natively
```

See `docker-compose.yml` and `Makefile` for all targets.

### Option B — Native install (no Docker)

For Ubuntu/Debian, the script can print the exact `apt` commands, or run them
for you:

```bash
./aviqr.sh install            # print the commands
./aviqr.sh install --yes      # actually install Java/Postgres/Mongo/Redis/RabbitMQ/Node
                               # (uses sudo, asks for confirmation first)
```

For macOS or Windows, or a fully manual Ubuntu walkthrough, follow
[`DEPLOYMENT_NO_DOCKER.md`](./DEPLOYMENT_NO_DOCKER.md) step by step — it has
exact commands per OS, including creating the `aviqr` Postgres role, Mongo
user, and RabbitMQ user/permissions.

### Database setup (seed / unseed)

Once Postgres is running, create the 11 databases, schema, and demo data —
this is the **seed** step:

```bash
./aviqr.sh db-setup
```

This runs [`aviqr_setup.sql`](./aviqr_setup.sql) as the `postgres` superuser
(prompts for confirmation first, since it creates the `aviqr` role and 11
databases). Every shop/hotel/mall in the demo data has a full menu, rooms,
or vendors respectively, plus matching orders, payments, reviews, and QR
codes, so every feature has something to look at out of the box.

To wipe it all back out — the **unseed** step — drop the 11 databases:

```bash
./aviqr.sh db-teardown
```

This runs [`aviqr_teardown.sql`](./aviqr_teardown.sql) as the `postgres`
superuser (also prompts first — it's destructive). It drops the databases
entirely (force-terminating any open connections from running services) but
leaves the `aviqr` role itself in place. To go from a dirty/partially-seeded
state back to a clean demo dataset, run `db-teardown` then `db-setup` again.

`db-setup` is **not** safe to re-run on top of an existing install — Postgres
has no `CREATE DATABASE IF NOT EXISTS`, so it'll fail with "database already
exists" unless you `db-teardown` first.

---

## Build

```bash
./aviqr.sh build                  # build all 14 services
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

`run all` starts `service-registry` first and waits for Eureka to be healthy
(everything else needs it), then starts the remaining 14 services in small
batches — 4 at a time by default, set `AVIQR_START_BATCH_SIZE` to change it
— polling each batch until it registers before starting the next. Starting
all 14 at once is tempting but each Spring Boot JVM needs a few hundred MB
while booting; on a RAM-constrained machine that's enough to trigger the
Linux OOM killer, which kills services silently with no log line at all. If
you have RAM to spare, raising the batch size will finish faster.

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
./aviqr.sh db-setup                  Seed: run aviqr_setup.sql against local Postgres
./aviqr.sh db-teardown               Unseed: drop all 11 AviQR databases
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
