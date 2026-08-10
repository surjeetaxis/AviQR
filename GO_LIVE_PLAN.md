# AviQR — Go-Live Plan

**Scope:** core QR ordering platform (web + backend), AWS for production, GCP for staging, plus Android and iOS store submission. Compiled from README.md, CHANGES.md, QA_STRATEGY.md, QA_GAP_ANALYSIS.md, Jenkinsfile, JENKINS_PIPELINE.md, DEPLOYMENT_NO_DOCKER.md, aviqr-mobile-expo's app.json/README.md/SETUP.md, and live checks (DNS resolution, git-tracked files) against this repo.

Companion doc: a cost report covering hosting/storage/domain/messaging/payment-gateway pricing was produced alongside this plan (not checked into the repo — ask if you want it saved too).

---

## Where things stand

**Built & working**
- 10 Spring Boot microservices + Eureka + Gateway (Java 21)
- React 18/Vite dashboard, Expo mobile app with native `android/` and `ios/` projects already committed
- `Jenkinsfile`: build → package once → staging → smoke test → manual approval → production. The pipeline only needs an SSH host + key, so it's already cloud-agnostic.
- Mobile `app.json`: real bundle ID (`in.aviqr.app`), all iOS usage-description strings, Android permissions — store metadata is largely already in place.

**Tested**
- Backend: `gradlew build` — passing
- API: 298/303 pytest passing (`aviqr-api-tests`)
- Web E2E: 124/149 Playwright passing (`aviqr-ui-tests`)
- Mobile: 86/86 Jest passing

**Not yet true (as of this plan)**
- No AWS or GCP compute provisioned — DNS for `aviqr.in`, `api.aviqr.in`, `staging.aviqr.in`, `staging-api.aviqr.in` all return nothing
- A real GCP service-account key (`files/aviqr-503715-29ffb091e175.json`) is committed to git and pushed to GitHub
- No `eas.json` build profiles — the mobile app only knows one API URL (production), so it can't be QA'd against staging before a store submission
- No Apple Developer or Google Play Console enrollment yet
- Razorpay is on `rzp_test_` sandbox keys; Twilio/WhatsApp credentials are blank

### Target architecture

| | AWS — production | GCP — staging |
|---|---|---|
| Compute | 1× EC2 `t3.xlarge`, `ap-south-1`, Ubuntu 22.04 | 1× Compute Engine `e2-standard-4`, `asia-south1`, Ubuntu 22.04 |
| Storage | S3 bucket `aviqr-media` for menu photos/logos | local disk is fine — staging media is disposable |
| Domains | `aviqr.in`, `api.aviqr.in` | `staging.aviqr.in`, `staging-api.aviqr.in` |
| Spring profile | `production` | `staging` (already shipped per service) |

Two different cloud providers on purpose: a bad staging migration or load test can never reach the production box.

---

## Phase 1 — Rotate the exposed GCP key (do this first)

This has to happen before any real GCP staging work — provisioning infrastructure under a project whose only existing credential is already compromised is building on a bad foundation.

- [ ] **Revoke & regenerate the Vision OCR key.** `files/aviqr-503715-29ffb091e175.json` is committed at HEAD and pushed to `github.com:surjeetaxis/AviQR.git`. In GCP Console → IAM & Admin → Service Accounts → `vision-ocr@aviqr-503715.iam.gserviceaccount.com` → Keys: delete the exposed key, generate a new one, store it only in Jenkins/GitHub Actions credentials — never a file in the repo.
- [ ] **Scrub it from git history** — deleting the file in a new commit isn't enough, it's still in every earlier commit and in GitHub's history:
  ```bash
  pip install git-filter-repo   # or: brew install git-filter-repo
  git filter-repo --path files/aviqr-503715-29ffb091e175.json --invert-paths
  git push origin --force --all
  echo "files/*.json" >> .gitignore
  ```
  Anyone with a clone needs to re-clone afterward. **This is a destructive, history-rewriting operation on a shared remote — do it deliberately, not as a side effect of something else.**
- [ ] **Decide:** reuse project `aviqr-503715` for staging Compute Engine (recommended — one project, one bill, IAM already exists), but create a **new, separate** service account for Compute Engine/staging management, scoped to only what it needs.
- [ ] **Verify** billing is active on the GCP project — Compute Engine needs it; Vision API alone may have been running on free-tier credits.

## Phase 2 — Ship the pending fixes

- [x] `api/index.js` — `X-Platform`/`X-App-Version` headers (now committed — landed in `f8a03b0` since this plan was first drafted)
- [x] `MallDashboard.jsx` — real mall name instead of hardcoded "Forum Mall" (now committed — same commit)
- [x] Cluster 4 fix — shared modal's missing `onClose` (fixed this session, see below)
- [x] Cluster 5 fix — Customer Portal bottom nav (fixed this session, see below)
- [x] Cluster 1 fix — stale mall seed name in `test_mall.py` (fixed this session, see below)
- [x] iOS stray ATS exception removed from `app.json` (fixed this session, see below)
- [x] S3 default region corrected to `ap-south-1` (fixed this session, see below)

*(See the "Fixed this session" section at the end for exact diffs/reasoning on each.)*

## Phase 3 — Triage the remaining known test failures

QA_STRATEGY.md clusters 28 failures by root cause. Clusters 1, 4, 5 are fixed (above). What's left:

- [ ] **Cluster 3** — mall/supplier revenue reports, supplier subscription tab (3 tests) fail because the feature is genuinely stubbed. Decide: hide those tabs for v1, or ship a visible "coming soon" state.
- [ ] **Clusters 2, 6, 7** — QR preview image, 10 nav/click timeouts, OTP checkout step. Needs one-by-one triage per QA_STRATEGY §2b — likely a mix of selector drift and real UI issues. Largest remaining block of unknowns; budget real time here.
- [ ] **3 pytest failures** (pre-existing, cause not yet confirmed) — verify they're unrelated to launch-critical paths (auth, ordering, payment) before accepting as known issues.

## Phase 4 — Move off sandbox credentials

Needs account-owner access to Razorpay, an SMS provider, and both clouds — none of this can happen inside a coding session.

- [ ] **Razorpay live keys** — replace `rzp_test_…` with live `RAZORPAY_KEY_ID`/`SECRET`, register the production webhook URL, run one real low-value transaction end-to-end.
- [ ] **SMS/OTP + WhatsApp** — `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN` blank (OTP prints to console only); `APP_WHATSAPP_ENABLED=false` (WaSenderAPI). Twilio's India SMS rate (~₹7.90/message) is expensive at volume — benchmark an India-focused aggregator (MSG91, Gupshup) before committing.
- [ ] **Rotate JWT/DB/queue secrets — separately per cloud.** `.env.example` defaults (`aviqr_secret`) must not reach either box; use different secrets for AWS production and GCP staging.
- [ ] **Elastic Email** — turn it on (`APP_EMAIL_ENABLED=false`, `ELASTIC_EMAIL_API_KEY` unset currently). Free tier covers 3,000 emails/month, enough for launch.

## Phase 5 — Provision AWS (production)

Per `DEPLOYMENT_NO_DOCKER.md` Part 2.

- [ ] Launch EC2 `t3.xlarge`, Ubuntu 22.04, `ap-south-1`, 100GB gp3, Elastic IP
- [ ] Security group: 22 from your IP only, 80/443 public, DB ports closed (Postgres/Mongo/Redis/RabbitMQ bind to localhost)
- [ ] Install Java 21, Postgres 17 (9 per-service DBs), MongoDB 8.0, Redis 7.4 (`requirepass` set), RabbitMQ 3.13 (default `guest` user deleted), Nginx, certbot
- [ ] systemd units target `/var/www/aviqr/current/backend/<svc>.jar` from day one (not retrofitted later) — `release.sh`'s symlink-swap rollback depends on this path existing from the first deploy
- [ ] Create S3 bucket `aviqr-media` in `ap-south-1` (region default now fixed in code, see below) and set `AWS_S3_REGION=ap-south-1`
- [ ] Prefer an instance IAM role over static AWS keys on disk for S3 access

## Phase 6 — Provision GCP (staging)

```bash
gcloud config set project aviqr-503715
gcloud services enable compute.googleapis.com

gcloud compute addresses create aviqr-staging-ip --region=asia-south1

gcloud compute instances create aviqr-staging \
  --zone=asia-south1-a \
  --machine-type=e2-standard-4 \
  --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud \
  --boot-disk-size=100GB --boot-disk-type=pd-balanced \
  --address=aviqr-staging-ip \
  --tags=aviqr-staging

gcloud compute firewall-rules create aviqr-staging-web \
  --allow=tcp:80,tcp:443 --target-tags=aviqr-staging --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create aviqr-staging-ssh \
  --allow=tcp:22 --target-tags=aviqr-staging --source-ranges=<your-ip>/32
```

- [ ] Install the same stack as AWS, but `SPRING_PROFILES_ACTIVE=staging` (every service already ships `application-staging.properties`, no code changes needed)
- [ ] Skip S3/GCS for staging media — local disk is fine, staging data is disposable
- [ ] Confirm no org policy blocks external IPs if this project sits inside a GCP organization (fails silently on the address-reservation step otherwise)

## Phase 7 — DNS & TLS

```
aviqr.in              → <AWS Elastic IP>
api.aviqr.in           → <AWS Elastic IP>
staging.aviqr.in       → <GCP static IP>
staging-api.aviqr.in   → <GCP static IP>
```

- [ ] Confirm `aviqr.in` is actually registered (it currently returns no DNS records at all)
- [ ] `sudo certbot --nginx -d <hostnames>` on each box independently

## Phase 8 — Wire the deploy pipeline

- [ ] **Pick one deploy path** — Jenkins or GitHub Actions. `JENKINS_PIPELINE.md` §4: once Jenkins is verified, disable `deploy-production.yml`'s triggers so the same push can't deploy twice.
- [ ] Jenkins credentials: `production-ssh-key` (AWS `.pem`-style), `staging-ssh-key` (GCP — add the key via `~/.ssh/authorized_keys` or `gcloud compute os-login ssh-keys add`, a different mechanism than AWS)
- [ ] Dry run to the approval gate: push to `master`, watch Build&Test → Package → Deploy to (GCP) Staging → smoke test, stop before approving the (AWS) production promotion

## Phase 9 — Data, migrations, first admin, backups

- [ ] No demo/seed data in production — Liquibase migrations only
- [ ] **Register the real super admin the moment AWS production is reachable**, before sharing any public link (first registered `ADMIN` user becomes super admin per README)
- [ ] Backup strategy for **production only** — `pg_dump`/`mongodump` to S3 on a cron. Nothing exists today anywhere in the six repos.

## Phase 10 — Legal review

- [ ] Confirm `aviqr-ui-web/src/pages/legal/` Terms & Privacy copy is real and reviewed, at a resolving domain. This blocks phases 12 and 13 too — the mobile app's `privacyPolicyUrl`/`termsUrl` point at `https://aviqr.in/privacy` and `/terms`.

## Phase 11 — Staging rehearsal (on GCP)

- [ ] Run every suite against `staging.aviqr.in`, not localhost — confirm `UI_URL` actually points there (QA_STRATEGY.md's own cautionary tale: a prior run silently tested an unrelated app squatting on port 5173)
- [ ] One real end-to-end order in live-mode: register → login → build a menu → scan QR → order → pay (real low-value Razorpay live transaction) → KOT/invoice → notification arrives
- [ ] Build an EAS `preview` profile pointed at `staging-api.aviqr.in` and run the same walkthrough from a phone — first time the mobile client will have been tested against anything but `localhost`
- [ ] No load/perf testing exists anywhere (QA_STRATEGY §10) — at minimum a basic concurrent-order smoke (`k6`/`ab`) against the gateway
- [ ] Rehearse the AWS rollback for real (deploy, then roll back one release) before a production incident is when you find out

## Phase 12 — Cutover: web & backend to AWS

- [ ] Freeze `master`, tag the release, approve the Jenkins production gate — same jars already verified on GCP staging get promoted, no rebuild
- [ ] Smoke test: `curl https://api.aviqr.in/actuator/health` → `{"status":"UP"}`, one real login, one real order

## Phase 13 — Android (Play Store)

- [ ] Add `eas.json` with `development`/`preview`/`production` build profiles, each injecting a different API URL — `src/api/index.js` currently only branches `__DEV__` vs one hardcoded `PROD_URL`
- [ ] Google Play Console account — $25 one-time, start early (review can take a day or two)
- [ ] Generate a real release signing key via `eas credentials` — **never** reuse the committed `debug.keystore`
- [ ] `eas build -p android --profile production` → AAB
- [ ] Play Console listing: screenshots, description, content rating questionnaire, Data Safety form (must match `app.json`'s actual camera/location/photo permissions)
- [ ] Don't claim push notifications in the listing — `expo-notifications` was deliberately removed per `SETUP.md`
- [ ] Confirm current Play Store target-API-level requirement at submission time
- [ ] Internal Testing track first, then a staged percentage rollout — not 100% on day one

## Phase 14 — iOS (App Store)

- [ ] Apple Developer Program enrollment — $99/year, approval can take 24–48h, start in parallel with infra work
- [x] Stray ATS exception for IP `65.109.133.21` removed from `app.json` (fixed this session, see below)
- [ ] App Store Connect record with bundle ID `in.aviqr.app` (already set), confirm "AviQR" is available
- [ ] `eas credentials` (distribution cert + provisioning profile) → `eas build -p ios --profile production` → `eas submit -p ios`
- [ ] TestFlight beta before public release (first submission, no store history yet)
- [ ] **Prepare reviewer access** — the single most common rejection reason for this kind of app: a demo owner account + a fixed QR code routing to a seeded demo shop, with working credentials in App Store Connect's review notes
- [ ] iPad screenshots required alongside iPhone (`supportsTablet: true`)
- [ ] Same privacy policy/terms URL liveness requirement as Android

## Phase 15 — First 48 hours

- [ ] No monitoring/alerting exists anywhere — at minimum an uptime check on each service's `/actuator/health`, eyes on Eureka and logs for two days
- [ ] Billing alerts on both AWS and GCP before real traffic
- [ ] `sentryDsn` in `app.json` is currently empty — until real crash reporting exists, Play Console/App Store Connect's own crash dashboards are the only mobile signal

---

## Fixed this session

The following were addressed directly in the working tree (**not committed** — review and commit when ready; nothing was pushed):

1. **Cluster 4 — "onClose is not a function"** (real bug, root cause found).
   `aviqr-ui-web/src/layouts/DashboardLayout.jsx` renders `<Sidebar .../>` without passing an `onClose` prop (it's a desktop layout, there's no drawer to close). But `Sidebar.jsx`'s `handleLogout` — bound to the "Sign out" button both walkthroughs click at the end — called `onClose()` unconditionally: `const handleLogout = () => { onClose(); logout(); navigate('/'); };`. Fixed to `onClose?.()`, matching the optional-chaining pattern already used elsewhere in the codebase (e.g. `ConfirmCodeModal.jsx`). **File:** `aviqr-ui-web/src/components/Sidebar.jsx`.

2. **Cluster 5 — Customer Portal bottom nav not found** (test drift, not an app bug).
   The component was refactored into a shared, generic `BottomNav` (`aviqr-ui-web/src/components/customer/BottomNav.jsx`, a "floating pill" nav also usable elsewhere) using classes `bn-wrap`/`bn-item`, but `aviqr-ui-tests/tests/12_customer_portal.spec.js` was never updated off the old `.cps-nav`/`.cps-nav-item` selectors. Separately, the new nav's buttons are icon-only (label lives only in `aria-label`, no visible text), so the old `:has-text("Orders")` selector wouldn't have matched even with the right class. Updated all 5 selectors in the spec file: `.cps-nav` → `.bn-wrap`, and the two `:has-text()` clicks → `.bn-item[aria-label="…"]`. **File:** `aviqr-ui-tests/tests/12_customer_portal.spec.js`. The app code itself needed no change.

3. **Cluster 1 — stale mall seed data** — investigated, **no code change needed**.
   Checked `aviqr-backend/aviqr_setup.sql` directly: mall `f35f1a27-…` (the `MALL_1` constant in `aviqr-api-tests/config.py` and `FORUM_MALL_ID` in the Playwright specs) is currently seeded as `'Forum Mall Bengaluru'`, matching what `test_mall.py` and the UI specs already expect. `FoodCourtHome.jsx` (the customer-facing page) fetches the mall by the URL's `:mallId` param via `mallApi.getPublicMall(mallId)` and renders the real `mall.name` — no hardcoding there. QA_STRATEGY.md's note about this cluster appears to describe an earlier state of the seed file (commit history shows `aviqr_setup.sql`'s mall rows were rewritten on 2026-07-26, after that doc was likely written) — the only actual hardcode was `MallDashboard.jsx`'s owner-view header, which was already fixed in the pending uncommitted diff from before this session. **Not independently verified against a live-running stack** — no backend services were up locally (Postgres has no `malls` table yet), so this is a static-analysis conclusion, not a test run. Re-run `pytest test_mall.py` and the `12_customer_portal.spec.js`/`zz_customer_full_walkthrough.spec.js`/`11_restaurant_request_and_food_court.spec.js` specs against a real deploy to confirm.

4. **iOS ATS exception removed** — `aviqr-mobile-expo/app.json`'s `NSAppTransportSecurity.NSExceptionDomains` allowed insecure HTTP to a raw IP, `65.109.133.21` (a stale dev/staging server reference). Removed; `NSAllowsLocalNetworking: true` already covers legitimate local-dev traffic.

5. **S3 default region corrected** — `menu-ocr-service/src/main/resources/application.properties`: `aws.s3.region` default changed from `eu-north-1` (Stockholm) to `ap-south-1` (Mumbai), matching where the rest of this deployment actually targets.

**Verification run this session:**
- `aviqr-ui-web`: `vite build` — succeeds (validates the Sidebar.jsx JSX change compiles). `vitest run` — 48/48 passing (no regressions).
- `aviqr-mobile-expo`: `npm run test:logic` — 71/71 passing (no regressions from the app.json edit).
- Full Playwright/pytest suites **not** re-run — no backend stack was running locally (confirmed: `localhost:8080` not reachable, `aviqr_mall` database has no tables yet). Re-run these against staging once Phase 6/11 stand up the GCP box.

## Explicitly not touched this session

- **The exposed GCP key itself** — rotating it requires GCP console access, and scrubbing git history requires a force-push to the shared remote. Both need your explicit go-ahead (Phase 1 above).
- **Clusters 2, 3, 6, 7** (QR preview image, stubbed revenue tabs, 10 nav timeouts, OTP checkout step) — still open, see Phase 3.
- **Any cloud provisioning, DNS, live credentials, or store enrollment** — all require account access this session doesn't have.

## Files changed this session (uncommitted — confirmed via `git status`)

```
 M aviqr-backend/menu-ocr-service/src/main/resources/application.properties  (S3 region default)
 M aviqr-mobile-expo/app.json                                                (ATS exception removed)
 M aviqr-ui-tests/tests/12_customer_portal.spec.js                          (Cluster 5 fix)
 M aviqr-ui-web/src/components/Sidebar.jsx                                   (Cluster 4 fix)
?? GO_LIVE_PLAN.md                                                          (new file)
```

Note: `api/index.js` and `MallDashboard.jsx` (Phase 2's first two items) are no longer in this list — they were committed separately (`f8a03b0`, part of a batch of "added eureka and staging profile" commits) partway through this conversation, outside this session's own edits.
