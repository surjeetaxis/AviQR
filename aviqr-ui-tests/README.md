# AviQR UI Test Automation

Playwright end-to-end tests for `aviqr-ui-web`, driving a real Chromium
browser against the real dev server and the real backend (through
`api-gateway`) — no mocking. Covers every role's dashboard, public marketing
pages, and full per-persona user journeys (register → login → dashboard →
CRUD → logout style walkthroughs).

## What's covered

- **`01_public.spec.js`** — landing/marketing pages, no auth
- **`02_owner.spec.js`** — owner/manager/cashier/kitchen dashboards
- **`03_admin.spec.js`** — platform admin console
- **`04_support.spec.js`** — support console (tickets, impersonation, audit)
- **`05_hotel.spec.js`**, **`06_mall.spec.js`**, **`07_supplier.spec.js`** — the other three staff roles
- **`08_validation.spec.js`** — form validation + login screenshots per role (has visual snapshot baselines)
- **`09_new_dashboards.spec.js`**, **`10_spec_audit.spec.js`** — cross-cutting dashboard/spec checks
- **`11_restaurant_request_and_food_court.spec.js`**, **`12_customer_portal.spec.js`** — customer-facing QR/ordering flows
- **`zz_*_full_walkthrough.spec.js`** — one complete end-to-end journey per persona (customer, owner, manager, kitchen, cashier, hotel, mall, supplier, support, admin, new-user-signup)
- **`zzz_contact_smoke.spec.js`** — smoke check for the public contact form

Visual regression baselines live alongside their specs
(`01_public.spec.js-snapshots/`, `08_validation.spec.js-snapshots/`) —
Playwright will fail a test if a screenshot drifts from the committed
baseline; update baselines deliberately with `npx playwright test --update-snapshots`
when a UI change is intentional, not to silence a failure you haven't looked at.

Recorded walkthrough videos from past runs live in `presentation-videos/` and
`videos/` — these are artifacts, not part of the executable suite.

## Prerequisites

1. Backend running and seeded (see `aviqr-backend/README.md`):
   ```bash
   cd ../aviqr-backend
   ./aviqr.sh db-setup     # if not already seeded
   ./aviqr.sh run all
   ```
2. Web app dev server running:
   ```bash
   cd ../aviqr-ui-web
   npm install && npm run dev   # http://localhost:5173
   ```

## Running

```bash
./run.sh                   # full suite, headless
./run.sh headed            # visible browser
./run.sh public            # only public pages
./run.sh owner             # only owner/manager/cashier/kitchen
./run.sh admin             # only admin
./run.sh support            # only support
./run.sh hotel              # only hotel
./run.sh mall                # only mall
./run.sh supplier            # only supplier
./run.sh validate           # cross-cutting validation + login screenshots
./run.sh report             # open the last HTML report
```

First run auto-installs Playwright + Chromium (`npm install && npx playwright install chromium`).

Environment overrides:
```bash
UI_URL=http://localhost:5173   # default
API_URL=http://localhost:8080  # default
```

Config: `workers: 1` (sequential, not parallel — matches how the seeded demo
data is shared across specs), screenshots always captured, video/trace
retained on failure only. Reports and screenshots are written to
`screenshots/` and the Playwright HTML report directory.

## Notes for anyone extending this suite

- Tests are **not currently run in CI** (see `QA_STRATEGY.md` at the monorepo
  root for the proposed CI wiring) — run locally before merging any web UI
  change that touches a covered area.
- Follow the existing `zz_*_full_walkthrough.spec.js` naming/shape for a new
  persona's end-to-end journey; follow the numbered `NN_*.spec.js` pattern
  for a new cross-cutting area.
- `helpers.js` has shared login/navigation utilities — reuse rather than
  re-implementing per-spec login flows.
