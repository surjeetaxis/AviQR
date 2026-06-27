# AviQR API Test Automation

API-level test suite covering all 11 user-facing backend services (auth,
shop, menu, order, payment, qr, hotel, mall, support, report, review) across
every user type the platform supports (ADMIN, SUPPORT, OWNER, MANAGER,
KITCHEN, CASHIER, CUSTOMER, HOTEL, MALL, SUPPLIER), run entirely through the
real `api-gateway` — the same entry point the web and mobile apps use.

It's API-only (no browser): every test logs in via `POST /api/v1/auth/login`
and drives the real REST endpoints directly. This is faster and more stable
than browser automation, and exercises every service and role boundary the
frontends rely on.

## What's covered

- `test_health.py` — Eureka registration, gateway routing sanity
- `test_auth.py` — login/register for every user type, validation errors, admin user management
- `test_access_control.py` — missing/invalid token rejection, cross-tenant isolation (owner A can't touch owner B's data)
- `test_shop.py`, `test_menu.py`, `test_order.py`, `test_payment.py`, `test_qr.py`,
  `test_hotel.py`, `test_mall.py`, `test_support.py`, `test_report.py`, `test_review.py`
  — one file per service: CRUD, role boundaries, and the public/no-auth routes

Tests run against the **dummy data seeded by `aviqr-backend/aviqr_setup.sql`**
(Spice Route, Grand Palace Hotel, Forum Mall, etc.) — this suite assumes that
seed data exists. It is not meant to run against production.

A few tests create new rows (a QA ticket, a QA review, a throwaway order) or
toggle a value and then immediately toggle it back (shop tagline, item
availability, room status) — by design, so re-running the suite repeatedly
doesn't snowball unbounded data. The handful of genuinely additive rows (new
support tickets, reviews, orders, QR codes) are harmless demo-data noise, not
state corruption.

## Prerequisites

1. The backend running and seeded:
   ```bash
   cd ../aviqr-backend
   ./aviqr.sh db-setup     # if not already seeded
   ./aviqr.sh run all
   ```
2. Python 3.10+ with the dependencies in `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   # or, on a system with PEP 668 "externally managed" Python:
   pip install --user --break-system-packages -r requirements.txt
   ```

## Running

```bash
./run_tests.sh                       # everything, HTML + JUnit XML reports
./run_tests.sh -k order               # only tests matching "order"
./run_tests.sh -m "not mutates"       # skip tests that create/modify data
AVIQR_BASE_URL=http://other-host:8080 ./run_tests.sh
```

Reports land in `reports/report.html` (open in a browser) and
`reports/junit.xml` (for CI).

## Layout

- `config.py` — gateway/Eureka URLs, seeded user credentials, known demo-data IDs
- `client.py` — thin `requests` wrapper (adds the `Authorization: Bearer` header)
- `conftest.py` — logs in as every seeded user type once per run, exposes one fixture per role (`owner`, `admin`, `customer`, etc.)
- `test_*.py` — one file per service/concern

## Known gaps in the app this suite surfaced

While mapping the endpoints to write these tests, a few backend authorization
gaps came up (not fixed here — flagging for awareness):
- `shop-service`'s staff endpoints (`POST/PUT/DELETE /api/v1/staff/**`) and
  `settings` endpoints have no role/ownership check at all — any authenticated
  user can modify any shop's staff or settings.
- `report-service`'s `/api/v1/reports/admin/platform` has no `ADMIN` check
  despite the path implying one.
