# AviQR — QA Strategy & Test Package

**Scope**: `aviqr-backend` (Java 21 / Spring Boot, 10 microservices), `aviqr-ui-web`
(React 18 + Vite), `aviqr-mobile-expo` (Expo SDK 54 / React Native), plus the
three sibling test repos that already exist for them: `aviqr-api-tests`,
`aviqr-ui-tests`, `aviqr_mobile_tests`.

**How this document was produced**: a full audit of all six repos (source,
existing tests, CI/CD config), followed by writing and *running* new test
cases for the real gaps found, and fixing the small number of defects that
were safe and directly in scope. This is deliberately **gap-focused**, not a
from-scratch rewrite — three of the six repos already have mature test
suites (250 pytest API tests, 23 Playwright specs, ~45 Jest tests), and
duplicating them would waste effort and create two sources of truth. Where
this document doesn't repeat something, it's because it's already covered —
see the coverage map in §2.

---

## 1. System Under Test

| Component | Stack | Test frameworks already configured |
|---|---|---|
| `aviqr-backend` | Java 21, Spring Boot 3.3, Spring Cloud Gateway/Eureka, 10 services, PostgreSQL/MongoDB/Redis/RabbitMQ | JUnit 5 + Mockito (unit, per-service `src/test`) |
| `aviqr-ui-web` | React 18, Vite, react-router-dom, Context (no Redux), axios | Vitest only — **no component/integration test capability installed** (no RTL, no Playwright/Cypress in this repo) |
| `aviqr-mobile-expo` | Expo SDK 54, React Native 0.81, Expo Router, axios | Jest + `jest-expo` + React Native Testing Library (logic + 5 shared-component tests); Detox scaffolded but **not functional** |
| `aviqr-api-tests` | pytest + `requests`, black-box, through the real gateway | **250 tests / 20 files**, all 12 seeded roles |
| `aviqr-ui-tests` | Playwright (Chromium) | **12 role-based specs + 11 full persona walkthroughs** + visual snapshots |
| `aviqr_mobile_tests` | Jest + Detox scaffold | **Stale — see §4.6** |

---

## 2. Existing Coverage Map (master-prompt categories → what's already real)

| Category | Status | Where |
|---|---|---|
| Functional / CRUD / positive-negative-boundary (API) | ✅ Mature | `aviqr-api-tests` — one file per service, `test_access_control.py`, `test_security.py` |
| Backend/API testing (GET/POST/PUT/DELETE, auth, RBAC, pagination) | ✅ Mature | `aviqr-api-tests` (250 tests); **PATCH support added this pass** — `client.py` had no `patch()` helper until now |
| Security (SQLi, XSS, RBAC, cross-tenant isolation) | ✅ Mature | `test_security.py`, `test_access_control.py` (30 tests) |
| UI testing (navigation, forms, per-role dashboards) | ✅ Mature (web, via Playwright) | `aviqr-ui-tests` — but **zero unit/component-level coverage** inside `aviqr-ui-web` itself (see §4.4) |
| Mobile — login/registration/QR-scan/role-routing/order-status logic | ✅ Partial | `aviqr-mobile-expo/__tests__` (Layer 1 logic + API-contract, ~31/45 passing) |
| Mobile — camera/GPS/deep-linking/offline | ⚠️ Used in-app but **untested** | See §4.7 |
| Mobile — push notifications, biometrics | N/A — **not implemented in the app** (see §4.8) — don't write tests for features that don't exist |
| E2E user journeys (register→login→dashboard→CRUD→logout, per role) | ✅ Mature | `aviqr-ui-tests/tests/zz_*_full_walkthrough.spec.js` (11 personas) |
| Regression suite | ✅ Exists implicitly | Full `pytest` run + full Playwright run *is* the regression suite — see §7 |
| Smoke suite | ✅ Exists | `pytest -m smoke`, `aviqr-ui-tests/run.sh public` — see §8 |
| Database testing (constraints, transactions, migrations) | ⚠️ Partial | New: Liquibase migration correctness verified live this pass (§3); no dedicated DB-constraint test file exists yet — see §9 |
| Performance/load/stress testing | ❌ **None exists anywhere in the six repos** | See §10 |
| React component/hook/error-boundary testing | ❌ **Effectively none** (2 files that copy logic by hand, don't import real components) | See §4.4 |
| React Native component testing beyond 5 shared components | ⚠️ Partial | See §4.7 |
| CI/CD wiring of the above | ⚠️ **Partial — this is the single biggest gap** | See §4.1 |

---

## 2a. Full Suite Execution Results (latest run)

All four suites were actually executed end-to-end, not just inventoried.

| Suite | Result |
|---|---|
| `aviqr-backend` (Gradle, 10 services) | ✅ `BUILD SUCCESSFUL` |
| `aviqr-api-tests` (pytest) | 298 passed / 3 failed (pre-existing, unrelated — §4.5) / 2 skipped, 303 total |
| `aviqr-mobile-expo` (Jest logic) | ✅ 71/71 passed |
| `aviqr-mobile-expo` (Jest components) | ✅ 15/15 passed |
| `aviqr-ui-tests` (Playwright) | 124 passed / 25 failed, 149 total — see §2b |

**Operational gotcha found while running this**: `aviqr-ui-web`'s dev server
normally binds to port 5173, but another, unrelated project
(`/Users/surjeetkumar/workspace/ui/peeler_ui_react`) was already squatting on
that port on this machine. The first full Playwright run silently tested
*that* app instead (it has a completely different CSP referencing
`pci.axisrooms.com` and no AviQR routes), producing ~138 meaningless
"failures" before this was caught and corrected by starting `aviqr-ui-web` on
its fallback port (5174) and re-pointing the suite at it via `UI_URL`.
**Anyone running this suite should verify `http://localhost:5173` (or
whatever `UI_URL` resolves to) is actually serving `aviqr-ui-web` — check the
page `<title>` is "AviQR Owner — Dashboard" — before trusting a failing run.**

## 2b. Playwright Failure Breakdown (25 failures, root-cause clustered)

**Cluster 1 — stale mall seed data ("Forum Mall Bengaluru" expected, doesn't
render)** — 4 tests: `11_restaurant_request_and_food_court.spec.js` (customer
food-court view), `12_customer_portal.spec.js` (food-court shell nav),
`zz_customer_full_walkthrough.spec.js`. **Same root cause as the
`test_mall.py` API test failure in §4.5** — the seeded mall's name changed
(`aviqr_setup.sql` now produces "Phoenix Market City" for the `MALL_1`
constant, not "Forum Mall Bengaluru"). One data-drift issue, five test
failures across both suites.

**Cluster 2 — QR preview/image not rendering** — 4 tests: Hotel QR
Management ("Live Preview" not visible), Mall Food Court QR image (x2, in
`11_restaurant_request_and_food_court.spec.js` and
`zz_mall_full_walkthrough.spec.js`), Supplier "Main Brand QR" not visible.
Spans three different roles' QR features — worth checking whether this is
one shared QR-preview component regression or three independent
data-dependency issues (possibly downstream of Cluster 1's mall-ID mismatch
for the mall one specifically).

**Cluster 3 — features still stub/mock, tests correctly catching it** — 3
tests explicitly asserting "real data, not the generic stub/zero":
Mall Reports (per-vendor revenue), Supplier Reports (per-outlet revenue),
Supplier Subscription tab. Consistent with `QA_GAP_ANALYSIS.md`'s existing
note that supplier/mall dashboards have real incompleteness — these tests
look like they were written *to track* that gap, not a new regression.

**Cluster 4 — real JS bug**: `"[pageerror] onClose is not a function"`,
caught twice (Cashier and Manager walkthroughs) by both tests' own
console-error assertions. A component is being rendered without an `onClose`
prop it calls unconditionally — likely a shared modal/dialog component used
from both roles' pages. Worth a direct fix; the two failing tests already
pinpoint exactly which walkthroughs trigger it.

**Cluster 5 — Customer Portal bottom nav (`.cps-nav`) not found** — all 3
tests in `12_customer_portal.spec.js`'s nav-shell describe block. Looks like
a real UI regression in `CustomerPortalShell`/`BottomNav`, independent of the
mall-data issue (these three fail before ever reaching mall content).

**Cluster 6 — navigation/click timeouts (10 tests)**: Mall tab
navigation/modals (`09_new_dashboards.spec.js`, `10_spec_audit.spec.js`,
restaurant-invite flow), Admin/New-user-signup/Restaurant-Owner full
walkthroughs. All `TimeoutError: page.click`/`locator.click` — consistent
with either UI structure drift (a tab/button label or selector changed since
these specs were written) or a knock-on effect of Cluster 1 (a walkthrough
that visits mall pages early and never recovers). Needs one-by-one triage,
not a single fix.

**Cluster 7 — OTP checkout step**: 1 test (`12_customer_portal.spec.js`'s
full order-flow test) — "Enter OTP" text not found during the
anonymous-browse-then-checkout flow.

None of this pass's actual changes (session/impersonation/analytics,
CORS fix, `toDto` fix) caused any of these — all 25 are in `aviqr-ui-web`
areas untouched this session (mall, supplier, hotel QR, customer portal,
walkthroughs). Recommend triaging Cluster 4 (real bug, cheap fix) and
Cluster 1 (data drift, cheap fix, unblocks 5 tests across two suites) first;
Clusters 3/6 need product/eng judgment calls before "fixing," since some of
Cluster 3 may be correctly failing until the underlying feature is built.

---

## 3. New, Verified Test Coverage Added This Pass

The most recent backend work (device/platform session tracking, real
impersonation-token minting, admin/support user-edit endpoint, cross-cutting
analytics — see `aviqr-backend/API_REFERENCE.md`) predates the 250-test suite
and had zero API-level test coverage. Added:

**`aviqr-api-tests/test_sessions_impersonation_analytics.py`** (15 tests, all
passing live against the running stack):

| Test | What it guards |
|---|---|
| `test_login_with_platform_header_returns_session_fields` | `X-Platform` header → `sessionId`/`platform`/`accountStatus`/verification flags in login response |
| `test_login_without_platform_header_defaults_to_unknown` | Graceful default when clients don't send the header |
| `test_admin_can_list_a_users_sessions` | `GET /auth/admin/users/{id}/sessions` |
| `test_non_admin_non_support_cannot_list_sessions` | RBAC boundary |
| `test_admin_can_revoke_a_single_session_without_affecting_others` | Per-session revoke doesn't touch sibling sessions |
| `test_admin_can_revoke_all_sessions_for_a_user` | Bulk revoke |
| `test_impersonation_mints_a_real_usable_token` | The core regression: impersonation must return a token that *actually* authenticates as the target, not just a log row |
| `test_ending_impersonation_marks_the_session_revoked` | End-impersonation revokes the session record (see the documented stateless-JWT caveat in the test's own docstring) |
| `test_non_support_non_admin_cannot_start_impersonation` | RBAC boundary |
| `test_support_can_patch_a_customers_profile_fields` | New `PATCH` endpoint round-trip, incl. a regression guard for the `avatar`/`preferredLanguage`-dropping bug found and fixed this pass |
| `test_non_admin_non_support_cannot_patch_a_user` | RBAC boundary |
| `test_support_analytics_overview_returns_expected_shape` / `_logins_by_platform` / `_tickets_breakdown` | New `/support/analytics/*` endpoints |
| `test_non_support_non_admin_cannot_view_analytics` | RBAC boundary |

Also added: `patch()` helper to `aviqr-api-tests/client.py` (didn't exist —
no endpoint had ever used `PATCH` before).

**Full suite re-run after these additions: 303 tests total (250 pre-existing
+ 15 new + others added since), 297 passed, 4 pre-existing failures found and
triaged — one fixed as part of this pass (§4.3), three flagged as unrelated
pre-existing platform issues (§4.5).**

---

## 4. Findings From This QA Pass

### 4.1 CI never runs the API or UI test suites (highest-value finding)

`.github/workflows/ci.yml` has exactly three jobs: backend unit tests, web
unit tests, mobile logic/component tests. **It does not invoke
`aviqr-api-tests` or `aviqr-ui-tests` at all.** The 250+15-test API suite and
23-spec Playwright suite — both mature and valuable — only run when a human
remembers to run them locally. A regression in cross-service RBAC, a broken
checkout flow, or a broken dashboard for any of the 7 roles can merge to
`master` and deploy without either suite ever executing.

**Recommendation** (not wired in yet — deliberately left as a proposal, not
silently added as a required gate, since it needs the full stack — 4 infra
services + 10 Java services + Eureka — running inside the runner, which is a
meaningful new piece of CI infrastructure that should be validated before it
can block merges):

```yaml
  api-integration:
    name: API integration tests (aviqr-api-tests)
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_USER: aviqr, POSTGRES_PASSWORD: aviqr_secret }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      mongo:
        image: mongo:8
        ports: ['27017:27017']
      redis:
        image: redis:7.4
        ports: ['6379:6379']
      rabbitmq:
        image: rabbitmq:3.13-management
        ports: ['5672:5672']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21' }
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - name: Seed database
        run: |
          cd aviqr-backend
          PGPASSWORD=postgres psql -h localhost -U postgres -f aviqr_setup.sql
      - name: Start full backend stack
        run: |
          cd aviqr-backend
          ./aviqr.sh run all
          # poll Eureka until all 10 services show STATUS:UP before proceeding
      - name: Run API test suite
        run: |
          cd aviqr-api-tests
          pip install -r requirements.txt
          pytest -m smoke --tb=short -q   # fail fast
          pytest --html=report.html --self-contained-html
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: api-test-report, path: aviqr-api-tests/report.html }
```

A `ui-e2e` job would follow the same shape, additionally starting
`aviqr-ui-web`'s dev server and running `aviqr-ui-tests/run.sh`. Recommend
landing `api-integration` first (it's self-contained — service containers
only), validate its stability for a week or two, then add `ui-e2e`.

### 4.2 Two parallel production-deploy pipelines

`Jenkinsfile` (root) and `.github/workflows/deploy-production.yml` are both
live, independent paths to production. `aviqr-backend/deploy/JENKINS_PIPELINE.md`
already documents this and says one should be retired once Jenkins is
verified — as of this audit, neither has been. Not a test-coverage gap, but a
real operational risk (the same push could theoretically be deployed twice by
two different systems); flagging here since it affects which pipeline any new
CI smoke-test gate (§4.1) should hook into.

### 4.3 Fixed this pass

- **CORS was missing `PATCH`** in `api-gateway`'s `allowed-methods` (both
  `application.properties` and `application-production.properties` — grep
  confirmed neither had it). This would have silently broken the new
  `PATCH /auth/admin/users/{id}` endpoint for any real browser client (a
  preflight `OPTIONS` would have been rejected) — curl-based manual testing
  never caught it because CORS is browser-enforced. Fixed and verified via a
  live preflight request; `Access-Control-Allow-Methods` now includes `PATCH`.
- **`AdminUserController.toDto()` silently dropped `avatar`/`preferredLanguage`**
  — a second, hand-duplicated mapping function (separate from
  `AuthService.toDto()`) that predates this pass but was only exposed by
  testing the new `PATCH` endpoint end-to-end: editing those two fields and
  then re-fetching the user showed them as `null`. Fixed; regression-guarded
  by the new pytest test's `assert "avatar" in fetched`.
- **`test_report.py::test_platform_stats_admin_only` was asserting stale,
  insecure behavior** — its own inline comment said "report-service itself
  doesn't gate this — documented gap, not a 403," but `ReportController` was
  already fixed to gate `/admin/platform` to ADMIN/SUPPORT (confirmed in
  source). The test still expected `200` for a shop OWNER and was failing
  because the *fix* had shipped but the *test* hadn't been updated. Corrected
  to expect `403`, now passing.

### 4.4 `aviqr-ui-web` has effectively zero real UI test coverage

Only two "test" files exist (`src/__tests__/billing.test.js`,
`orderHelpers.test.js`), and both **hand-copy logic** from `Billing.jsx` /
`Orders.jsx` / `KOT.jsx` rather than importing the real components — they
will not catch a regression if the real implementation drifts from the
copied logic. No React Testing Library, no `jsdom` test environment
configured (`vitest.config.js` uses `environment: 'node'`), so no component
can currently be rendered in a test even if RTL were added.

**Recommendation** (not implemented this pass — a meaningfully separate
effort from the backend gap this pass targeted): add
`@testing-library/react` + `jsdom`, then prioritize component tests for the
highest-risk pages found in the audit — `Settings.jsx` (1373 lines, OWNER-only,
no coverage), `AdminDashboard.jsx` (2413 lines), `CustomerMenu.jsx` (1286
lines, the actual checkout flow) — before broader page coverage. Also:
`Analytics.jsx` and `OrderHistory.jsx` bypass the shared `api` axios client
and hand-roll `fetch()` calls reading `localStorage` directly — this means
they don't get the shared client's auto-refresh-on-401 behavior. Worth its
own test case once component testing exists: verify these two pages actually
handle an expired token instead of silently failing.

### 4.5 Three unrelated pre-existing test failures (not fixed — flagged for follow-up)

Found while re-running the full 303-test suite; none touch anything changed
in this or the recent backend session/impersonation work:

- `test_mall.py::test_get_mall_requires_auth` — expects mall name `"Forum
  Mall Bengaluru"`, actual seeded data now returns `"Phoenix Market City"`
  for the same `MALL_1` constant. Looks like seed-data drift in
  `aviqr_setup.sql` (mall insert order/content changed) that the test's
  hardcoded expected name never caught up with.
- `test_order.py::test_customer_places_order_and_can_fetch_it` — expects a
  fresh CASH order's status to be `"NEW"`, actual is `"PENDING_PAYMENT"`.
  Suggests `order-qr-service`'s default status logic changed at some point
  (possibly to support a payment-confirmation step even for CASH orders)
  without the test being updated.
- `test_order.py::test_new_order_appears_in_kitchen_live_view` — a knock-on
  effect of the same status change: the kitchen "live" view apparently
  filters out `PENDING_PAYMENT` orders, so a newly placed order isn't found
  there.

**Recommendation**: assign to whoever owns `order-qr-service`/`shop-mall-service`
to confirm whether `PENDING_PAYMENT` and the new mall data are intentional
recent changes (in which case: fix the three tests) or regressions (in which
case: fix the app code). Left untouched here since neither module was part
of this session's actual changes, and guessing which side is "correct"
without that context risks masking a real bug or breaking working seed data.

### 4.6 `aviqr_mobile_tests` is a stale, superseded fork

Confirmed via `diff` and git history: this directory's Jest/Detox tests
diverged from — and are older than (last touched 2026-07-01 vs.
2026-07-26 for the in-app copy) — the tests that now live inside
`aviqr-mobile-expo/__tests__` and `aviqr-mobile-expo/e2e`. Its own copy of
`src/api/index.js` still uses an older token-storage pattern. Per the scope
decision for this pass, **not modified** — flagging for the team to decide
between archiving/deleting it. Extending it further would test a copy of the
app that no longer matches what ships.

### 4.7 Mobile: real device-capability usage exists but is untested; and a real client/server header mismatch

- `expo-camera` (QR scanning, `app/(customer)/scan.js`) and `expo-location`
  (nearby-shops, shop-onboarding) are real, used features with **no test
  coverage** — Detox is the natural fit but is non-functional today (§ next
  bullet).
- Detox E2E (`e2e/login.e2e.js`, `e2e/orderFlow.e2e.js`) selects elements via
  `by.id('login-email')` etc., but a repo-wide grep for `testID` across all
  ~90 screens returns **zero matches**, and `detox` itself isn't even in
  `devDependencies`. Per the earlier scope decision, this pass **did not**
  add `testID` props — flagged as a concrete, scoped follow-up: add `testID`
  to the ~10-15 elements the two existing Detox specs already reference,
  install `detox`, and get those two specs passing before writing more.
- **Real gap**: the backend's new login headers (`X-Platform`, `X-Device-Id`,
  `X-Device-Model`, `X-App-Version`, documented in `API_REFERENCE.md`) are
  never sent by the mobile app — confirmed via repo-wide grep, the axios
  client in `src/api/index.js` sets only `Authorization` (and `Content-Type`
  for one multipart upload). This isn't a bug (the backend defaults
  gracefully to `platform: "UNKNOWN"`), but it means session/analytics data
  from real mobile users is currently indistinguishable from web — the
  analytics `activeSessionsByPlatform` breakdown built this pass is only as
  useful as the clients that populate it. `expo-constants` is already a
  dependency (used for `hostUri`/Sentry), so `Platform.OS` +
  `Constants.expoConfig.version` are cheaply available if/when the mobile
  team wants to wire this up in the request interceptor.

### 4.8 Push notifications and biometrics: don't write tests for what isn't there

`app.json` still declares `NSUserNotificationsUsageDescription` (iOS) and
`POST_NOTIFICATIONS` (Android) permission strings, but `expo-notifications`
was deliberately removed (`SETUP.md` documents this) and no code path
references it — so no runtime permission prompt should ever fire. Similarly,
no biometric library is present. The master prompt's mobile-testing checklist
asks for push-notification and biometric test cases; per the "don't test
what doesn't exist" principle, the one legitimate test case here is
**negative**: verify the app never prompts for a notification permission at
runtime, since the manifest entry with no backing code is exactly the kind of
mismatch that causes confusing store-review or permission-audit findings
later.

### 4.9 Secrets hygiene (unrelated to testing, worth flagging anyway)

`/Users/surjeetkumar/workspace/surjeet/AviQR/files/` — a folder of pitch
decks and business docs — contains a live-looking GCP service-account JSON
key (`aviqr-503715-29ffb091e175.json`) sitting in plain view. Not opened
(appropriately treated as a secret). Recommend the team confirm it isn't
committed to git history and rotate it if it's ever been exposed.

---

## 5. Security Checklist (grounded in what's actually been tested)

| Item | Status |
|---|---|
| SQL injection | ✅ Covered — `test_security.py` |
| XSS | ✅ Covered — `test_security.py` |
| Broken access control / cross-tenant isolation | ✅ Extensively covered — `test_access_control.py` (11), `test_security.py` (30), plus new RBAC boundary tests this pass for sessions/impersonation/PATCH/analytics |
| JWT validation (missing/invalid/expired token) | ✅ Covered | `test_access_control.py` |
| Password encryption | ✅ BCrypt(12), verified in `QA_VERIFICATION_REPORT.md`'s prior pass |
| Session management / revocation | ⚠️ New this pass — session listing/revoke tested; **stateless-JWT limitation documented**: revoking a session (incl. ending an impersonation) does not invalidate an already-issued access token before its natural expiry, since the gateway only checks signature+expiry, never the DB. This is platform-wide, pre-existing behavior for *all* logout, not new — but worth a deliberate decision on whether it's acceptable long-term (a gateway-side revocation cache/deny-list would close it). |
| CSRF | N/A — stateless Bearer-token API, no cookie-based session, standard mitigation (no CSRF tokens needed) — not a gap |
| File upload security (OCR menu image upload) | ❌ Not covered by any existing test — recommend adding: oversized file, wrong content-type, path traversal in filename |
| Sensitive data exposure | ⚠️ See §4.9 (GCP key), otherwise no plaintext secrets found in test assertions/logs |
| Rate limiting | ⚠️ Configured (Redis-backed, gateway) for a few routes (login, OTP, QR scan) — no test currently exercises the actual rate-limit threshold being enforced |

---

## 6. Performance Checklist

**No load/stress/spike/endurance testing exists anywhere in the six repos.**
This is a genuine, complete gap — not partially covered by anything found in
this audit. Recommended starting point (not implemented this pass — a new
capability, not a fix to existing gaps):

- **k6** (scriptable in JS, easiest to hand to whoever already knows the
  `aviqr-ui-tests`/mobile JS stack) hitting the gateway for: login, menu
  fetch, order placement, QR-scan-redirect — the four highest-traffic
  customer-facing paths.
- Start with a load test (steady expected concurrent users), then spike
  (QR-code scan burst after a marketing push is the platform's actual
  realistic spike scenario), before endurance/soak.
- Baseline API response-time budgets don't exist yet either — recommend
  setting them from a first load-test run's p50/p95, not guessing upfront.

---

## 7. Regression Suite

The regression suite **is** the existing full test run, not a new artifact:

```bash
cd aviqr-api-tests && ./run.sh                 # 303 tests, ~20s
cd aviqr-ui-tests   && ./run.sh                 # all 23 specs
cd aviqr-mobile-expo && npm run test:logic && npm run test:components
cd aviqr-backend    && ./gradlew test           # per-service unit tests
```

Run all four before any release; `aviqr-api-tests`'s pytest markers
(`smoke`, `security`, `billing`, `inventory`, `crm`, `aggregator`,
`analytics`, `mutates`, `slow`) let you scope a partial regression run when a
change is known to be localized (e.g. `pytest -m "billing or crm"` for a
billing-only change).

## 8. Smoke Suite

Already defined and phase-gated: `aviqr-api-tests/run_qa.sh` runs
`pytest -m smoke` first and stops immediately if it fails, before running
the full suite. `aviqr-ui-tests/run.sh public` covers the equivalent
smoke-level UI check (unauthenticated public pages load).

---

## 9. Database Testing — recommended additions

No dedicated DB-constraint/transaction test file exists in any repo today.
Given `auth-service`/`support-service` now run Liquibase (verified live this
pass — both changesets applied cleanly with zero errors against the seeded
dev DB), recommended next additions:
- A Testcontainers-based JUnit test (`auth-service`) that boots a throwaway
  Postgres, runs the Liquibase changelog from empty, and asserts the
  `refresh_tokens`/`impersonation_logs` schema matches the JPA entities —
  catches drift between the entity and the changelog before it reaches a
  real environment.
- Constraint tests for the handful of `NOT NULL`/`UNIQUE` constraints that
  currently only get exercised incidentally (e.g. duplicate email/phone on
  register — already covered in `test_auth.py`; unique refresh-token value
  collision — not covered, low risk given UUID-based tokens).

---

## 10. Automation Plan Summary

| Priority | Action | Effort |
|---|---|---|
| 1 | Wire `aviqr-api-tests` into CI (§4.1 proposal) | Medium — new infra, validate before making it a required gate |
| 2 | Add `testID`s to the ~10-15 elements the existing (non-functional) Detox specs reference; install `detox` | Small |
| 3 | Add RTL + `jsdom` to `aviqr-ui-web`, start with `Settings.jsx`/`AdminDashboard.jsx`/`CustomerMenu.jsx` | Medium |
| 4 | Wire `aviqr-ui-tests` into CI once (1) is stable | Medium |
| 5 | k6 load test for login/menu/order/QR-scan | Medium |
| 6 | File-upload security tests for OCR endpoint | Small |
| 7 | Reconcile the 3 unrelated pre-existing test failures (§4.5) with the relevant service owners | Small (once triaged) |

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Notes |
|---|---|---|---|
| Regression ships to prod because API/UI suites never ran | **High** (nothing prevents it today) | High | §4.1 — the single biggest real risk found |
| Double-deploy from two live production pipelines | Medium | High (deploy race/inconsistency) | §4.2 |
| Web app UI regression undetected at unit level | High | Medium (caught by Playwright eventually, but late in the loop) | §4.4 |
| Session-revocation-doesn't-kill-live-token surprises someone relying on "instant" impersonation cutoff | Low-medium | Medium | §4.3/§5 — documented, not necessarily wrong, but should be a conscious decision |
| Stray cloud credential in a shared folder | Low (until it isn't) | High if exploited | §4.9 |

---

## 12. Defect Report Template

```markdown
### [Severity] Short title
- **Found in**: repo/file/endpoint
- **Environment**: local / staging / prod, commit/branch
- **Steps to reproduce**:
  1.
  2.
- **Expected**:
- **Actual**:
- **Evidence**: curl output / screenshot / test failure log
- **Suspected root cause** (if known):
- **Suggested fix / owner**:
```

## 13. Test Summary Report Template

```markdown
### Test Run Summary — <date>
- **Suites run**: aviqr-api-tests / aviqr-ui-tests / mobile Jest / backend Gradle (check applicable)
- **Totals**: X passed, Y failed, Z skipped
- **New failures vs. last run**: list
- **Known/accepted failures**: list with linked defect
- **Coverage delta**: (if measured)
- **Go/no-go recommendation**:
```
