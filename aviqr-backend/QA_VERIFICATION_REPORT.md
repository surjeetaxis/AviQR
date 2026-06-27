# QA Verification Report — AviQR Backend

Scope: live verification of the actually-implemented platform (auth, shop, menu, order, payment, qr, hotel, mall, support, notification, report, ocr, review services) — not the aspirational enterprise spec, which `QA_GAP_ANALYSIS.md` already covers. All 15 services were built, started, and exercised against real Postgres/MongoDB/Redis/RabbitMQ instances with live HTTP calls (not unit tests). Bugs found during verification were fixed in place; each fix was re-verified live (negative case blocked, legitimate positive case still works) before moving on.

---

## 1. Summary

| Area | Result |
|---|---|
| Build (`./gradlew build -x test`) | ✅ Pass, all 15 modules |
| Service startup (Eureka registration) | ✅ All 15 registered UP after fixes |
| Auth (register/login/OTP/refresh/profile) | ✅ Works after fixes (see #1, #8) |
| RBAC | ❌→✅ Was almost entirely absent platform-wide; retrofitted and verified (see §3) |
| Shop CRUD/search/pagination | ✅ Works |
| Menu CRUD/search/pagination (categories/items/pricing rules) | ✅ Works after RBAC fix |
| Order lifecycle (NEW→ACCEPTED→PREPARING→READY→COMPLETED) | ✅ Works, incl. RabbitMQ event → Mongo notification |
| QR generation/scan/tracking | ❌→✅ Anonymous scan was completely broken (401); fixed |
| Hotel room/room-request CRUD | ✅ Works after RBAC fix |
| Mall vendor CRUD + public directory | ❌→✅ Public directory was unreachable; fixed |
| Payment create-order/refund/list | ⚠️ Works, but is a **mocked** Razorpay integration (no real API call, fake signature scheme) |
| Support tickets + impersonation logging | ✅ Works after RBAC fix |
| Audit logging (auth-service → MongoDB) | ✅ Confirmed entries written |
| Seed data idempotency | ❌ Not idempotent — see §5 |

---

## 2. Fixed Issues Report

### Blocking / Critical

**1. JWT secret mismatch — gateway rejected every valid token.**
Under the `local` Spring profile, `auth-service` signs JWTs with `aviqr_super_secret_key_min_32_chars_long_dev_only` (its own `application-local.properties`), but `api-gateway` had no local override and fell back to a *different* default (`aviqr_super_secret_key_min_32_chars_long`, no `_dev_only` suffix). Every authenticated request through the gateway returned 401, regardless of credentials or role — this blocked all further RBAC testing until fixed.
Fix: added the matching `app.jwt.secret` to `api-gateway/src/main/resources/application-local.properties`.
Verified: ADMIN token → `GET /api/v1/auth/profile` via gateway now returns 200 (was 401).

**2. Privilege escalation in `AdminUserController`.**
Only `listUsers` checked `X-User-Role`; `getUser`, `changeStatus`, `changeRole`, `deleteUser`, and `stats` had no check at all. Reproduced live: a logged-in **CUSTOMER** called `PUT /api/v1/auth/admin/users/{ownId}/role?role=ADMIN` and successfully became ADMIN, and separately viewed another user's full profile via `GET /admin/users/{id}`.
Fix: added `X-User-Role` checks (ADMIN for mutations, ADMIN/SUPPORT for reads) to all five endpoints.
Verified: same CUSTOMER token now gets 403 on both actions; ADMIN can still perform them. Test data reverted.

**3. Systemic missing RBAC across almost the entire backend.**
Audited every controller: **only `support-service`'s impersonate endpoint had any role check anywhere in the platform.** menu-service, order-service, hotel-service, mall-service, payment-service, qr-service, and (mostly) support-service had zero ownership/role verification on mutating endpoints — any authenticated user of any role (including CUSTOMER) could create/edit/delete another tenant's menu items, categories, pricing rules, flip any shop's status, change any order's status, view any order/payment/ticket, manage any hotel's rooms, manage any mall's vendors, refund any payment, or list all payments/tickets platform-wide.
Reproduced live (then reverted) for two representative cases: a CUSTOMER suspended an active shop via `PUT /shops/{id}/status`, and a CUSTOMER deleted/edited menu items belonging to a shop they don't own.
Fix — added ownership + role checks to every mutating/sensitive endpoint in:
- **menu-service**: categories, items (incl. availability toggle), pricing rules — checked against `X-Shop-Id` header (populated from the JWT's `shopId` claim for OWNER/MANAGER/MENU_EDITOR/staff roles), ADMIN bypass.
- **order-service**: live/paged shop orders, status update, get-by-id, shop/item stats — shop-staff-ownership check, plus "customer can view/cancel their own order" logic. Required adding a `customerId` field to `OrderResponse` (was missing, so the check had nothing to compare against).
- **hotel-service**: hotel update, room create/status/QR-toggle, room-request listing/status-update — checked against `Hotel.ownerId` via repository lookup (hotel role's JWT doesn't carry a usable shop-id-style claim, so ownership is resolved server-side instead of trusting a header).
- **mall-service**: mall update, vendor add/toggle/delete, full cross-tenant mall listing — checked against `Mall.adminId`; full listing restricted to ADMIN.
- **payment-service**: refund, shop payments, get-by-payment-id, all-payments — ADMIN or owning shop's OWNER/MANAGER, or (for get-by-id) the paying customer.
- **qr-service**: create QR / list shop QR codes — same `X-Shop-Id` pattern as menu-service.
- **support-service**: list tickets, get ticket, update status, assign, stats — ADMIN/SUPPORT, or (get-only) the ticket's own creator.

Every fix was verified with both a negative test (the wrong role gets 403) and a positive test (the legitimate owner/admin still succeeds) — see §4 for the full matrix and §6 for raw evidence.

**4. Core QR-scan flow returned 401 for anonymous customers.**
The gateway route for `/api/v1/qr-codes/**` required a valid JWT with no public carve-out. Scanning a physical table/room QR code (`GET /api/v1/qr-codes/r/{code}`) — the platform's core feature — failed with 401 for any customer who wasn't already logged in, which is the normal case for a walk-in diner.
Fix: split the gateway route into a public one (`/r/**`, `/*/image`) and a protected one (create/list QR codes for a shop, now also role-checked per issue 3).
Verified: anonymous `curl` (no Authorization header) to the scan endpoint now returns `302 Found` with the correct menu redirect; `scan_count` increments correctly.

**5. Mall vendor public directory was not actually public.**
`/api/v1/malls/public/{mallId}/vendors` exists specifically for anonymous QR-scan browsing of a mall's vendors, but the gateway's general `/api/v1/malls/**` route (with `AuthenticationFilter`) was registered at a lower index, so it intercepted the public path first — same class of bug as issue 4, just for malls.
Fix: added a `mall-service-public` route at a lower index, mirroring the existing pattern already used for `menu-service-public` and `review-service-public`.
Verified: anonymous request to the public vendor list now returns 200.

**6. Razorpay webhook unreachable.**
`/api/v1/payments/webhook/razorpay` sat behind `AuthenticationFilter` on the general payments route. Razorpay's server-to-server webhook never sends a user JWT, so every real webhook call would have been rejected with 401 — payment confirmations would silently never arrive.
Fix: carved out a public gateway route for the webhook path specifically.
Verified: anonymous POST to the webhook path now reaches `payment-service` (200) instead of failing at the gateway.

### Medium

**7. Seed password hash doesn't match the documented password.**
`aviqr_setup.sql` comments "Passwords are all: Test@1234" and uses one shared bcrypt hash across 15 demo users — but that hash does not actually verify against `Test@1234` (confirmed cryptographically with bcrypt). On top of that, several named demo accounts in the already-running dev database (admin, owner, hotel, mall, supplier, etc.) had yet another, different, non-matching hash. Net effect: password login was broken for every documented demo account.
Fix: generated a correct bcrypt hash (cost factor 12, matching `BCryptPasswordEncoder(12)` in `SecurityConfig`) for `Test@1234`, replaced all 15 occurrences in `aviqr_setup.sql`, and updated all 32 user rows in the live dev database.
Verified: `POST /api/v1/auth/login` with `surjeet@axisrooms.com` / `Test@1234` now returns a valid token (was "Invalid credentials" before).

**8. Invalid seed role value.**
`aviqr_setup.sql` seeded `support@aviqr.in` with `role='super Admin'` — not a valid `UserRole` enum constant (`ADMIN, SUPPORT, SUPPLIER, HOTEL, MALL, OWNER, MANAGER, CASHIER, KITCHEN, MENU_EDITOR, ORDER_VIEWER, CUSTOMER`). A fresh install running this script would seed a row Hibernate cannot deserialize, breaking the first read of that user (e.g. any admin user list/lookup) with a 500.
Fix: changed to `'SUPPORT'`, matching the account's actual purpose and the live (already-diverged) database value.

### Low

**9. `aviqr.sh run all` never starts `review-service`.**
`review-service` is in the `SERVICES` catalog (used by `stop`/`status`/`restart`) but missing from the explicit `start_one` sequence in `cmd_run`. Running `./aviqr.sh run all` silently leaves it down.
Fix: added the missing `start_one "review-service"` call.

**10. `aviqr.sh status` crashed on every run.**
`started=$(grep -c PATTERN file 2>/dev/null || echo 0)` — `grep -c` already prints `0` on no match (with exit code 1), so the `|| echo 0` fallback ran *too*, producing two lines (`"0\n0"`) in the captured variable and breaking the subsequent `[ "$started" -gt 0 ]` integer test with `integer expression expected`.
Fix: removed the redundant fallback.

### Documented, not fixed (out of scope for this pass)

- **`app.otp.bypass` / `app.otp.dev-code` in `auth-service/application-local.properties` are dead config** — `AuthService.java` actually reads `app.otp.dev-mode` / `app.otp.fixed-code`, different names entirely, so the intended "fixed OTP for local dev" convenience never activates. OTP login currently only works by reading the real OTP out of the service log (which is what this verification pass did). Low risk, cosmetic — flagging for a follow-up rather than fixing now.
- **payment-service is a mocked Razorpay integration** — `create-order` returns a fake order id without calling Razorpay; `/verify`'s signature scheme (`HMAC("orderId|paymentId")`) doesn't match Razorpay's actual documented payload+secret scheme; the webhook handler doesn't verify the `X-Razorpay-Signature` header at all (comment admits "In production: verify webhook signature"). This is a pre-existing stub, not a regression — flagged here rather than "fixed" with hand-rolled crypto that would create a false sense of security.

---

## 3. RBAC Matrix (as enforced after fixes)

Roles are the actual `UserRole` enum values; there is no DB-backed permission system, and the spec's ~13-role hierarchy (Hotel Group Owner, Branch Manager, etc.) does not exist — see `QA_GAP_ANALYSIS.md` §2.

| Capability | ADMIN | OWNER / MANAGER (own shop) | MENU_EDITOR (own shop) | KITCHEN / CASHIER / ORDER_VIEWER (own shop) | SUPPORT | HOTEL (own hotel) | MALL (own mall) | SUPPLIER | CUSTOMER |
|---|---|---|---|---|---|---|---|---|---|
| Manage any user (status/role/delete) | ✅ | ❌ | ❌ | ❌ | view-only | ❌ | ❌ | ❌ | ❌ |
| Update own shop profile | ✅ | ✅ (own) | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ |
| Flip shop ACTIVE/SUSPENDED status | ✅ | ❌ | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ |
| Manage menu (categories/items/pricing) | ✅ | ✅ (own) | ✅ (own) | ❌ | ❌ | n/a | n/a | n/a | ❌ |
| View/manage shop's orders | ✅ | ✅ (own) | ❌ | ✅ (own) | ❌ | n/a | n/a | n/a | own order only |
| Cancel own order | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | ✅ |
| Create/manage shop QR codes | ✅ | ✅ (own) | ❌ | ❌ | ❌ | n/a | n/a | n/a | ❌ |
| Scan QR / view public menu | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (anonymous too) |
| Manage own hotel/rooms | n/a | n/a | n/a | n/a | n/a | ✅ (own) | n/a | n/a | ❌ |
| Submit hotel room-service request | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (any logged-in user) |
| Manage own mall/vendors | n/a | n/a | n/a | n/a | n/a | n/a | ✅ (own) | n/a | ❌ |
| List all malls (cross-tenant) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View public mall vendor directory | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (anonymous too) |
| Refund / view shop's payments | ✅ | ✅ (own) | ❌ | ❌ | ❌ | n/a | n/a | n/a | own payment only |
| List all payments (platform-wide) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| List/manage all support tickets | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | own ticket (read-only) |
| Start user impersonation | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

`SUPPLIER` has no dedicated endpoints anywhere in the backend — the role exists on `User`/JWT but no controller checks for it. This matches the gap-analysis finding that "Vendor" (mall-service) is unrelated to B2B supplier management, which doesn't exist.

---

## 4. Database Schema (live, confirmed reachable)

All CRUD operations exercised in §6 round-tripped correctly against these tables (one Postgres DB per service) and Mongo collections — confirms the schema matches what each service's JPA/Mongo layer expects, with no drift errors encountered:

- **aviqr_auth**: `users`, `otp_records`, `refresh_tokens`
- **aviqr_shop**: `shops`, `shop_opening_hours`, `shop_staff`, `staff_permissions`, `shop_settings`
- **aviqr_menu**: `categories`, `menu_items`, `pricing_rules`
- **aviqr_order**: `orders`, `order_items`
- **aviqr_payment**: `payments`
- **aviqr_qr**: `qr_codes`, `qr_scan_logs`
- **aviqr_hotel**: `hotels`, `hotel_enabled_services`, `rooms`, `room_requests`
- **aviqr_mall**: `malls`, `vendors`
- **aviqr_support**: `support_tickets`, `impersonation_logs`
- **aviqr_report**: `report_snapshots`
- **aviqr_review**: `reviews`
- **MongoDB `aviqr_logs`**: `audit_logs` (auth-service), `notifications` (notification-service)

No tables for organizations/business-units/suppliers/subscriptions/invoices/activity-logs/etc. exist — see `QA_GAP_ANALYSIS.md` for the full gap vs. the enterprise spec.

---

## 5. Seed Data Report

`aviqr_setup.sql` (1202 lines) is **not idempotent**, contrary to the spec requirement ("Seed must be idempotent. Never delete existing production data."):
- 9 `CREATE DATABASE` statements with no existence check — fails immediately if databases already exist.
- 26 `CREATE TABLE` statements, none using `IF NOT EXISTS`.
- 0 `ON CONFLICT` clauses on any `INSERT` — re-running against a populated database will throw primary-key/unique-constraint violations on the hardcoded demo IDs.
- This script can only safely be run once, against a completely empty Postgres instance.

Seed coverage by role (live DB, confirmed via `SELECT role, COUNT(*) FROM users GROUP BY role`): CUSTOMER (20), OWNER (4), and one each of ADMIN, SUPPORT, MANAGER, CASHIER, KITCHEN, HOTEL, MALL, SUPPLIER. No seed data exists for the enterprise spec's additional roles (Platform Admin, Hotel Group Owner, Restaurant Group Owner, Branch Manager, Outlet Manager) since those roles don't exist in the `UserRole` enum.

Recommendation (not implemented in this pass — would require restructuring the whole script): wrap `CREATE TABLE` in `IF NOT EXISTS`, add `ON CONFLICT (id) DO NOTHING` to every demo-data `INSERT`, and guard the `CREATE DATABASE` statements (Postgres has no native `IF NOT EXISTS` for `CREATE DATABASE` pre-v18; needs a `DO $$ ... $$` existence check or a shell-level guard in `aviqr.sh db-setup`).

---

## 6. Test Evidence (representative excerpts)

All commands were run live against the actual stack (Postgres/Mongo/Redis/RabbitMQ + all 15 Spring Boot services), not mocks. Full session included ~80 curl calls; key before/after pairs:

```
# Issue 2 — privilege escalation (BEFORE fix)
$ curl -X PUT ".../auth/admin/users/<customerId>/role?role=ADMIN" -H "Authorization: Bearer <customerToken>"
HTTP/1.1 200 OK                                    # customer became ADMIN
$ psql ... "select role from users where id='<customerId>'"
role: ADMIN

# Issue 2 (AFTER fix)
$ curl -X PUT ".../auth/admin/users/<customerId>/role?role=ADMIN" -H "Authorization: Bearer <customerToken>"
HTTP/1.1 403 Forbidden

# Issue 3 — shop status flip (BEFORE fix)
$ curl -X PUT ".../shops/<shopId>/status?status=SUSPENDED" -H "Authorization: Bearer <customerToken>"
HTTP/1.1 200 OK                                    # active shop suspended by a random customer

# Issue 4 — QR scan (BEFORE fix)
$ curl ".../qr-codes/r/spiceroute"                 # no Authorization header
HTTP/1.1 401 Unauthorized
# (AFTER fix)
$ curl ".../qr-codes/r/spiceroute"
HTTP/1.1 302 Found
Location: https://aviqr.in/menu/00000000-0000-0000-0000-000000000101

# Order lifecycle, full round trip
$ curl -X POST ".../orders/shop/<shopId>" ... → 200, status=NEW
$ curl -X PUT ".../orders/<id>/status?status=ACCEPTED"  → ACCEPTED
$ curl -X PUT ".../orders/<id>/status?status=PREPARING" → PREPARING
$ curl -X PUT ".../orders/<id>/status?status=READY"     → READY
$ curl -X PUT ".../orders/<id>/status?status=COMPLETED" → COMPLETED
$ mongosh ... notifications.find({orderId:"<id>"})
→ { type: 'ORDER_NEW', title: 'New Order!', ... }  # RabbitMQ event consumed correctly

# Issue 7 — password login (BEFORE fix)
$ curl -X POST .../auth/login -d '{"email":"surjeet@axisrooms.com","password":"Test@1234"}'
{"success":false,"message":"Invalid credentials"}
# (AFTER fix)
{"success":true,"message":"Login successful", ...}
```

All test/throwaway data created during verification (test shop, test category, test pricing rule, test QR code, test payment) was deleted afterward; all role/status changes made to seed accounts during negative-test reproduction were reverted to their original values.
