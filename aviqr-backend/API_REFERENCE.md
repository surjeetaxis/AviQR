# AviQR Backend — Complete API Reference
## Base URL: `http://localhost:8080`
## Auth header: `Authorization: Bearer <accessToken>`

---

## 🔐 Auth Service — `/api/v1/auth`

Login/OTP-login accept optional client-identity headers, captured onto the
session (see **Sessions** below) — send these from web/Android/iOS so
support/admin can see which platform a login came from:

| Header | Example | Notes |
|---|---|---|
| `X-Platform` | `WEB` / `ANDROID` / `IOS` | Falls back to `UNKNOWN` if omitted or unrecognized |
| `X-Device-Id` | `a1b2c3...` | Stable per-install identifier, client-generated |
| `X-Device-Model` | `Pixel 8` / `iPhone 15` | Free text |
| `X-App-Version` | `1.4.2` | Free text |

IP address and `User-Agent` are captured automatically from the request — no
header needed for those.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user (owner/hotel/mall/supplier/customer) |
| POST | `/auth/login` | ❌ | Login with email + password (device headers above, optional) |
| POST | `/auth/otp/send` | ❌ | Send OTP to phone |
| POST | `/auth/otp/login` | ❌ | Login with phone + OTP (device headers above, optional) |
| POST | `/auth/refresh` | ❌ | Refresh access token — rotates the session (old refresh token revoked, device info carried forward) |
| POST | `/auth/logout` | ✅ | Body `{"refreshToken": "..."}` ends just that session; omit body to log out everywhere (unchanged default) |
| GET  | `/auth/profile` | ✅ | Get logged-in user profile |
| PUT  | `/auth/profile` | ✅ | Update name/phone/language/FCM token |
| PUT  | `/auth/change-password` | ✅ | Change password |
| POST | `/auth/forgot-password` | ❌ | Send password reset email |
| PUT  | `/auth/language` | ✅ | Update preferred language |
| GET  | `/auth/admin/users` | ✅ ADMIN/SUPPORT | List all users (paginated, search, filter) |
| GET  | `/auth/admin/users/{id}` | ✅ ADMIN/SUPPORT | Get single user |
| PATCH | `/auth/admin/users/{id}` | ✅ ADMIN/SUPPORT | Edit a user's name/email/phone/avatar/preferredLanguage directly — e.g. support fixing a typo blocking a customer's login |
| PUT  | `/auth/admin/users/{id}/status` | ✅ ADMIN | Activate/suspend/deactivate user |
| PUT  | `/auth/admin/users/{id}/role` | ✅ ADMIN | Change user role |
| DELETE | `/auth/admin/users/{id}` | ✅ ADMIN | Delete user |
| GET  | `/auth/admin/users/stats` | ✅ ADMIN/SUPPORT | User count by role |
| GET  | `/auth/admin/users/{id}/sessions` | ✅ ADMIN/SUPPORT | List a user's login sessions (platform, device, IP, timestamps, revoked state) |
| POST | `/auth/admin/users/{id}/sessions/{sessionId}/revoke` | ✅ ADMIN/SUPPORT | Force-end one session (e.g. remote-logout their Android app) |
| POST | `/auth/admin/users/{id}/sessions/revoke-all` | ✅ ADMIN/SUPPORT | Force-end every session for a user |

**Register request:**
```json
{
  "name": "Sujeet Narayanan",
  "email": "sujeet@spiceroute.in",
  "phone": "9845012345",
  "password": "Secure@123",
  "role": "OWNER",
  "shopName": "Spice Route",
  "preferredLanguage": "en"
}
```

**Auth response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "userId": "uuid",
    "name": "Sujeet Narayanan",
    "role": "OWNER",
    "shopId": null,
    "isOnboardingComplete": false,
    "sessionId": "uuid",
    "platform": "ANDROID",
    "accountStatus": "ACTIVE",
    "emailVerified": false,
    "phoneVerified": true
  }
}
```

**Session entry** (`GET /auth/admin/users/{id}/sessions`):
```json
{
  "id": "uuid",
  "platform": "ANDROID",
  "deviceId": "a1b2c3...",
  "deviceModel": "Pixel 8",
  "appVersion": "1.4.2",
  "ipAddress": "203.0.113.7",
  "userAgent": "aviqr-mobile-expo/1.4.2",
  "createdAt": "2026-07-30T10:15:00",
  "lastActiveAt": "2026-07-30T10:15:00",
  "expiresAt": "2026-08-06T10:15:00",
  "revoked": false,
  "revokedAt": null,
  "revokedBy": null
}
```

**Update-user request** (`PATCH /auth/admin/users/{id}`, all fields optional):
```json
{
  "name": "Corrected Name",
  "email": "fixed@example.com",
  "phone": "9800000000",
  "avatar": "https://...",
  "preferredLanguage": "hi"
}
```

---

## 🏪 Shop Service — `/api/v1/shops`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/shops` | ✅ OWNER | Create new shop |
| GET  | `/shops/my` | ✅ OWNER | Get all my shops |
| GET  | `/shops/{id}` | ✅ | Get shop by ID |
| PUT  | `/shops/{id}` | ✅ OWNER | Update shop details |
| PUT  | `/shops/{id}/status` | ✅ ADMIN | Change shop status |
| GET  | `/shops?search=&page=0&size=20` | ✅ ADMIN | Search all shops |

## 👥 Staff Management — `/api/v1/staff`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/staff/shop/{shopId}` | ✅ | Get all staff for shop |
| POST | `/staff/shop/{shopId}` | ✅ OWNER | Add staff member |
| PUT  | `/staff/{id}` | ✅ OWNER | Update staff details + permissions |
| PUT  | `/staff/{id}/role` | ✅ OWNER | Change staff role |
| DELETE | `/staff/{id}` | ✅ OWNER | Remove staff (soft delete) |

## ⚙️ Shop Settings — `/api/v1/settings`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/settings/shop/{shopId}` | ✅ | Get shop settings |
| PUT  | `/settings/shop/{shopId}` | ✅ OWNER | Save all settings (payment gateway, SMTP, loyalty) |

---

## 💰 Tax Rules — `/api/v1/tax-rules`

Shop-scoped tax overrides, checked in priority order (lowest first, first match wins) before
falling back to `shop_settings.tax_percent`. Lets a shop levy different rates by region
(state/city — defaults to the shop's own address), service type (outlet/room/order type),
or menu category.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/tax-rules/resolve/{shopId}?outletType=&category=&state=&city=` | ❌ | Resolve the applicable tax rate |
| GET  | `/tax-rules/shop/{shopId}` | ✅ | List all tax rules for a shop |
| POST | `/tax-rules/shop/{shopId}` | ✅ OWNER | Create a tax rule (REGION/SERVICE_TYPE/CATEGORY/DEFAULT) |
| PUT  | `/tax-rules/{id}` | ✅ OWNER | Update a tax rule |
| PUT  | `/tax-rules/{id}/active?active=true` | ✅ OWNER | Enable/disable a tax rule |
| DELETE | `/tax-rules/{id}` | ✅ OWNER | Delete a tax rule |

---

## 🍽️ Menu Service — `/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/menu/public/{shopId}?lang=hi&cat=uuid` | ❌ | **Customer-facing menu with dynamic pricing** |
| GET  | `/categories/shop/{shopId}` | ✅ | Get categories |
| POST | `/categories` | ✅ | Create category (with multilingual names) |
| PUT  | `/categories/{id}` | ✅ | Update category |
| DELETE | `/categories/{id}` | ✅ | Soft-delete category |
| GET  | `/items/shop/{shopId}` | ✅ | Get all items |
| POST | `/items` | ✅ | Create menu item |
| PUT  | `/items/{id}` | ✅ | Update menu item |
| PUT  | `/items/{id}/availability?available=true` | ✅ | Toggle item availability |
| DELETE | `/items/{id}` | ✅ | Delete item |
| GET  | `/pricing-rules/shop/{shopId}` | ✅ | Get pricing rules |
| POST | `/pricing-rules` | ✅ | Create pricing rule (TIME/DAY/DATE) |
| PUT  | `/pricing-rules/{id}` | ✅ | Update pricing rule |
| DELETE | `/pricing-rules/{id}` | ✅ | Delete pricing rule |

**Public menu response includes `effectivePrice` after dynamic pricing:**
```json
{
  "categories": [{
    "id": "uuid",
    "name": "स्टार्टर्स",
    "emoji": "🥗",
    "items": [{
      "id": "uuid",
      "name": "पनीर टिक्का",
      "price": 280.00,
      "effectivePrice": 308.00,
      "veg": true,
      "popular": true,
      "tag": "bestseller"
    }]
  }]
}
```

---

## 📦 Order Service — `/api/v1/orders`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/orders/shop/{shopId}` | Optional | **Customer places order** |
| GET  | `/orders/shop/{shopId}/live` | ✅ | Live orders for Kanban (NEW/ACCEPTED/PREPARING/READY) |
| GET  | `/orders/shop/{shopId}?status=NEW&page=0` | ✅ | Paginated shop orders |
| PUT  | `/orders/{id}/status?status=ACCEPTED` | ✅ | Advance order status |
| GET  | `/orders/customer/history?page=0` | ✅ | Customer order history |
| GET  | `/orders/{id}` | ✅ | Get single order |

**Order statuses:** `NEW → ACCEPTED → PREPARING → READY → COMPLETED` or `CANCELLED/REJECTED`

**Create order request:**
```json
{
  "customerName": "Anjali",
  "customerPhone": "9876543210",
  "tableNumber": "7",
  "type": "DINE_IN",
  "paymentMethod": "ONLINE",
  "items": [
    { "menuItemId": "uuid", "itemName": "Paneer Tikka", "quantity": 2, "unitPrice": 280.00 }
  ]
}
```

---

## 💳 Payment Service — `/api/v1/payments`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/create-order` | ✅ | Create Razorpay order before checkout |
| POST | `/payments/verify` | ✅ | Verify payment signature after Razorpay callback |
| POST | `/payments/webhook/razorpay` | ❌ | Razorpay webhook endpoint |
| GET  | `/payments/shop/{shopId}?status=CAPTURED` | ✅ | Shop payments |
| GET  | `/payments/{paymentId}` | ✅ | Get single payment |
| POST | `/payments/{paymentId}/refund` | ✅ ADMIN/SUPPORT | Initiate refund |
| GET  | `/payments?page=0` | ✅ ADMIN | All platform payments |

**Payment flow:**
1. Customer clicks Pay → `POST /payments/create-order` → get Razorpay order ID
2. Open Razorpay checkout modal with order ID
3. User pays → `POST /payments/verify` with signature
4. On success → update order payment status

---

## 📱 QR Service — `/api/v1/qr-codes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/qr-codes/shop/{shopId}?label=Table7&type=TABLE&group=7` | ✅ | Generate QR code |
| GET  | `/qr-codes/shop/{shopId}` | ✅ | List all QR codes for shop |
| GET  | `/qr-codes/r/{code}` | ❌ | **Redirect + track scan count** |
| GET  | `/qr-codes/{code}/image` | ✅ | Download QR as PNG |

**QR Types:** `SHOP`, `TABLE`, `GROUP`, `MALL`, `HOTEL_ROOM`, `CAMPAIGN`

---

## 🔔 Notification Service — `/api/v1/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/notifications` | ✅ | Get user notifications |
| GET  | `/notifications/unread-count` | ✅ | Count unread notifications |
| PUT  | `/notifications/{id}/read` | ✅ | Mark as read |
| POST | `/notifications/send` | ✅ ADMIN | Send notification to user |

---

## 🏨 Hotel Service — `/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/hotels` | ✅ HOTEL | Create hotel |
| GET  | `/hotels/my` | ✅ HOTEL | My hotels |
| GET  | `/hotels/{id}` | ✅ | Get hotel |
| PUT  | `/hotels/{id}` | ✅ HOTEL | Update hotel + enabled services |
| GET  | `/rooms/hotel/{hotelId}` | ✅ | Get all rooms |
| POST | `/rooms` | ✅ HOTEL | Add room |
| PUT  | `/rooms/{id}/status?status=OCCUPIED` | ✅ | Update room status |
| PUT  | `/rooms/{id}/qr?active=true` | ✅ | Toggle room QR |
| POST | `/room-requests` | ❌ | **Guest submits request (via QR)** |
| GET  | `/room-requests/hotel/{hotelId}?service=LAUNDRY&liveOnly=true` | ✅ | Get requests |
| PUT  | `/room-requests/{id}/status?status=DONE` | ✅ | Update request status |

---

## 🏬 Mall Service — `/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/malls` | ✅ MALL | Create mall |
| GET  | `/malls/my` | ✅ MALL | My malls |
| GET  | `/malls/{id}` | ✅ | Get mall |
| PUT  | `/malls/{id}` | ✅ MALL | Update mall + commission % |
| GET  | `/malls` | ✅ ADMIN | All malls |
| GET  | `/vendors/mall/{mallId}` | ✅ | Get vendors |
| POST | `/vendors` | ✅ MALL | Add vendor |
| PUT  | `/vendors/{id}/status?active=true` | ✅ | Enable/disable vendor |
| PUT  | `/vendors/{id}/qr?active=true` | ✅ | Toggle vendor QR |
| DELETE | `/vendors/{id}` | ✅ MALL | Remove vendor |
| GET  | `/malls/public/{mallId}/vendors` | ❌ | **Public — all active vendors** |

---

## 🎫 Support Service — `/api/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tickets` | ✅ | Create support ticket |
| GET  | `/tickets?status=OPEN&priority=URGENT&page=0` | ✅ SUPPORT | List tickets |
| GET  | `/tickets/{id}` | ✅ | Get ticket |
| PUT  | `/tickets/{id}/status?status=RESOLVED&resolution=...` | ✅ SUPPORT | Update ticket status |
| PUT  | `/tickets/{id}/assign?agentId=...` | ✅ SUPPORT | Assign ticket to agent |
| GET  | `/tickets/stats` | ✅ SUPPORT | Ticket counts by status |
| POST | `/support/impersonate` | ✅ SUPPORT/ADMIN | **Real** "log in as this customer" — mints a live 30-minute access token (see below), not just a log entry |
| POST | `/support/impersonate/{logId}/end` | ✅ SUPPORT/ADMIN | End an impersonation session and revoke its token immediately |
| GET  | `/support/impersonation-logs` | ✅ SUPPORT | My impersonation history |

**Impersonation is now functional, not just logged.** `POST /support/impersonate`
calls an internal auth-service endpoint to mint a real, short-lived (30 min)
access token for the target user, tagged with an `impersonatedBy` JWT claim,
and tracked as one of that user's sessions (so it also shows up in
`GET /auth/admin/users/{id}/sessions` and can be revoked from there).

**Start impersonation request:**
```json
{
  "targetUserId": "uuid",
  "targetUserName": "Anjali Singh",
  "agentName": "Arjun Nair",
  "reason": "Investigating TKT-10005 — order not received"
}
```

**Start impersonation response:**
```json
{
  "success": true,
  "data": {
    "impersonationLogId": "uuid",
    "accessToken": "eyJ...",
    "expiresIn": 1800,
    "targetUserId": "uuid",
    "targetUserName": "Anjali Singh",
    "targetUserRole": "CUSTOMER"
  }
}
```

---

## 📈 Support Analytics — `/api/v1/support/analytics`

Unified cross-cutting view for support/admin — users, sessions, tickets, and
revenue in one place, instead of the fragmented per-service `/stats`
endpoints. Reads auth-service and order-qr-service's databases read-only
(same pattern as Report Service below), plus support-service's own ticket/
impersonation data.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/support/analytics/overview` | ✅ ADMIN/SUPPORT | Users by role/status, active sessions by platform, tickets by status/priority, impersonation count, platform revenue |
| GET | `/support/analytics/logins?days=7` | ✅ ADMIN/SUPPORT | Login volume over time, broken down by platform (web/android/ios) |
| GET | `/support/analytics/tickets` | ✅ ADMIN/SUPPORT | Ticket volume/breakdown by status and priority |

**Overview response:**
```json
{
  "success": true,
  "data": {
    "usersByRole": { "customer": 1200, "owner": 85, "support": 4, "admin": 2 },
    "usersByStatus": { "active": 1250, "inactive": 30, "suspended": 11 },
    "activeSessionsByPlatform": { "web": 40, "android": 310, "ios": 95, "unknown": 2 },
    "ticketsByStatus": { "open": 12, "pending": 5, "resolved": 200, "closed": 180 },
    "ticketsByPriority": { "low": 40, "medium": 120, "high": 30, "urgent": 3 },
    "impersonationCount": 57,
    "platformRevenue": { "totalOrders": 4820, "totalRevenue": 1834250.00 }
  }
}
```

---

## 📊 Report Service — `/api/v1/reports`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | `/reports/shop/{shopId}/daily?range=TODAY` | ✅ | Daily KPIs (revenue, orders, avg, new customers) |
| GET  | `/reports/shop/{shopId}/revenue?days=7` | ✅ | Revenue trend (last N days) |
| GET  | `/reports/shop/{shopId}/top-items?limit=10` | ✅ | Top selling items |
| GET  | `/reports/shop/{shopId}/peak-hours` | ✅ | Order count by hour |
| GET  | `/reports/admin/platform` | ✅ ADMIN | Platform-wide aggregate stats |

---

## 🔍 OCR Service — `/api/v1/ocr`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ocr/upload` (multipart/form-data) | ✅ | Upload menu image/PDF for AI extraction |
| GET  | `/ocr/jobs/{id}` | ✅ | Poll OCR job status + results |
| GET  | `/ocr/jobs/shop/{shopId}` | ✅ | All OCR jobs for shop |
| POST | `/ocr/jobs/{id}/approve` | ✅ | Approve extracted items → push to menu-service |

**OCR job statuses:** `PENDING → PROCESSING → COMPLETED / FAILED`

---

## 🏗️ Architecture

```
Browser/Mobile
     │
     ▼
API Gateway :8080  ──── JWT Filter ──── Rate Limiter (Redis)
     │                                         │
     ├─── lb://auth-service      (x2)  ← Eureka Discovery
     ├─── lb://shop-service      (x2)
     ├─── lb://menu-service      (x2)
     ├─── lb://order-service     (x3)  → RabbitMQ → notification-service
     ├─── lb://payment-service   (x2)
     ├─── lb://qr-service        (x1)
     ├─── lb://hotel-service     (x2)  → RabbitMQ → notification-service
     ├─── lb://mall-service      (x2)
     ├─── lb://support-service   (x1)
     ├─── lb://report-service    (x1)
     └─── lb://ocr-service       (x1)  → RabbitMQ → menu-service

Infrastructure:
  PostgreSQL 17  — 9 databases (one per service with DB)
  MongoDB 8.0    — audit_logs, notifications, ocr_jobs
  Redis 7.4      — rate limiting, session cache
  RabbitMQ 3.13  — async events between services
  Eureka :8761   — service discovery + load balancing
```

## 🚀 Quick Start

```bash
# 1. Clone and enter directory
cd aviqr-backend

# 2. Copy env file
cp .env.example .env.local

# 3. Start infrastructure only
make up-infra

# 4. Wait 10s, then start registry
make up-registry

# 5. Start everything
make up

# 6. Check all services registered
open http://localhost:8761

# 7. Test auth endpoint
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@aviqr.com","password":"Test@1234","role":"OWNER"}'
```

## 🔑 Default Admin Credentials
- Email: `admin@aviqr.com`
- Password: `Admin@1234`
- Role: `ADMIN`

## 🔒 Internal service-to-service calls

`support-service` → `auth-service` for impersonation-token minting (and a few
other cross-service calls elsewhere in the platform) go directly over Eureka,
bypassing the gateway, and are trusted via a shared `X-Internal-Secret`
header plus the caller's own `X-User-Role`. Set `INTERNAL_SYNC_SECRET` in
`.env` in any environment where this should actually be enforced — if unset,
the secret check is skipped (dev-only default; **must** be set in staging/prod).
