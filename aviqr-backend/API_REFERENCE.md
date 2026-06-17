# AviQR Backend — Complete API Reference
## Base URL: `http://localhost:8080`
## Auth header: `Authorization: Bearer <accessToken>`

---

## 🔐 Auth Service — `/api/v1/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user (owner/hotel/mall/supplier/customer) |
| POST | `/auth/login` | ❌ | Login with email + password |
| POST | `/auth/otp/send` | ❌ | Send OTP to phone |
| POST | `/auth/otp/login` | ❌ | Login with phone + OTP |
| POST | `/auth/refresh` | ❌ | Refresh access token |
| POST | `/auth/logout` | ✅ | Logout + revoke refresh token |
| GET  | `/auth/profile` | ✅ | Get logged-in user profile |
| PUT  | `/auth/profile` | ✅ | Update name/phone/language/FCM token |
| PUT  | `/auth/change-password` | ✅ | Change password |
| POST | `/auth/forgot-password` | ❌ | Send password reset email |
| PUT  | `/auth/language` | ✅ | Update preferred language |
| GET  | `/auth/admin/users` | ✅ ADMIN | List all users (paginated, search, filter) |
| GET  | `/auth/admin/users/{id}` | ✅ ADMIN | Get single user |
| PUT  | `/auth/admin/users/{id}/status` | ✅ ADMIN | Activate/suspend/deactivate user |
| PUT  | `/auth/admin/users/{id}/role` | ✅ ADMIN | Change user role |
| DELETE | `/auth/admin/users/{id}` | ✅ ADMIN | Delete user |
| GET  | `/auth/admin/users/stats` | ✅ ADMIN | User count by role |

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
    "isOnboardingComplete": false
  }
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
| POST | `/support/impersonate` | ✅ SUPPORT/ADMIN | Start impersonation session |
| GET  | `/support/impersonation-logs` | ✅ SUPPORT | My impersonation history |

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
  -d '{"name":"Test","email":"test@aviqr.in","password":"Test@1234","role":"OWNER"}'
```

## 🔑 Default Admin Credentials
- Email: `admin@aviqr.in`
- Password: `Admin@1234`
- Role: `ADMIN`
