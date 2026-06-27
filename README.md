# AviQR — Restaurant & Hotel QR Platform

> QR-powered digital menu, live order management, 11 AI features, 9 Indian languages.
> Version 2.0 · June 2025

---

## Quick start (5 minutes, local dev)

### Prerequisites
- Docker + Docker Compose v2
- Java 21 (JDK)
- Node.js 20+
- Git

### 1. Clone and setup
```bash
git clone <your-repo-url> aviqr
cd aviqr
```

### 2. Start infrastructure
```bash
cd aviqr-backend
docker compose up -d postgres mongo redis rabbitmq
# Wait 30 seconds
docker compose ps   # all should show "healthy"
```

### 3. Start all backend services
```bash
# .env is pre-filled with dev defaults — no changes needed for local run
chmod +x ./gradlew
./gradlew build -x test          # builds all 14 JARs (5–8 min first time)
docker compose up -d             # starts all 14 microservices
# Wait 60 seconds then verify:
curl http://localhost:8761        # Eureka dashboard
curl http://localhost:8080/actuator/health   # Should show {"status":"UP"}
```

### 4. Start web frontend
```bash
cd ../aviqr-ui-web
npm install
npm run dev    # opens http://localhost:5173
```

### 5. Login
- URL: http://localhost:5173
- Register a new account OR use demo login on the login page
- First registered user with role ADMIN becomes the super admin

---

## Project structure

```
aviqr/
├── aviqr-backend/          # 14 Spring Boot microservices (Java 21)
│   ├── service-registry/   # Netflix Eureka (port 8761)
│   ├── api-gateway/        # Spring Cloud Gateway (port 8080)
│   ├── auth-service/       # JWT auth, OTP, registration
│   ├── shop-service/       # Shop CRUD, staff, loyalty
│   ├── menu-service/       # Categories, items, pricing, inventory
│   ├── order-service/      # Orders, KOT, GST invoices
│   ├── payment-service/    # Razorpay integration
│   ├── qr-service/         # QR code generation
│   ├── notification-service/ # WhatsApp, email, push
│   ├── hotel-service/      # Hotel rooms + room service
│   ├── mall-service/       # Mall vendors
│   ├── support-service/    # Support tickets
│   ├── report-service/     # Real SQL analytics
│   └── ocr-service/        # Google Vision OCR
│
├── aviqr-ui-web/           # React 18 + Vite 5 owner dashboard
│   └── src/
│       ├── pages/          # All page components
│       │   ├── ai/         # AIHub.jsx — 11 AI features
│       │   ├── admin/      # Admin panel (live data)
│       │   ├── legal/      # Terms + Privacy pages
│       │   └── ...
│       └── components/
│           ├── ai/         # All 11 AI components + aiClient.js
│           └── shared/     # SEO, LangPicker, Onboarding
│
└── aviqr-mobile-expo/      # Expo React Native app
    └── app/
        ├── (owner)/        # Owner screens
        ├── (hotel)/        # Hotel manager screens
        ├── (mall)/         # Mall manager screens
        ├── (admin)/        # Admin screens
        └── (customer)/     # Customer QR menu
```

---

## AI features (all at /ai in dashboard)

| Feature | What it does |
|---------|-------------|
| Admin Assistant | Ask any business question, get streaming Claude response |
| Recommendations | People Also Ordered, Trending, Chef's Pick, Best Value |
| Smart Menu Search | Natural language: "veg under ₹300", "jain food" |
| Support Chatbot | Customer Q&A, human escalation path |
| AI Analytics | Streaming business intelligence report |
| Description Writer | Short/long desc, allergens, taste profile, SEO tags |
| Review Sentiment | Analyse reviews, find issues, get recommendations |
| Fraud Detection | Risk score per order, flags, recommended actions |
| Demand Forecast | 7-day prediction, inventory needs, staff scheduling |
| Dynamic Pricing | AI-generated promotions + peak surcharge |
| Voice Ordering | Speak to order (Chrome/Edge required) |

---

## Environment variables (for production)

Edit `aviqr-backend/.env` with real values:

| Variable | Required | Get from |
|----------|----------|---------|
| `JWT_SECRET` | Yes | `openssl rand -hex 32` |
| `RAZORPAY_KEY_ID` + `SECRET` | Yes | razorpay.com Dashboard |
| `TWILIO_ACCOUNT_SID` + `AUTH_TOKEN` | High | console.twilio.com |
| `SMTP_USER` + `SMTP_PASSWORD` | High | Gmail App Password |
| `GOOGLE_VISION_API_KEY` | Optional | Google Cloud Console |
| `VITE_SENTRY_DSN` | Optional | sentry.io |

---

## Test suite

```bash
chmod +x aviqr_test_suite.sh
./aviqr_test_suite.sh http://localhost:8080
# Expected: ALL PASS
```

---

## Production deployment

See `AVIQR_DEPLOYMENT_GUIDE.md` for full production deployment guide.

**Quick summary:**
1. Provision server (Ubuntu 22.04, 8 vCPU / 16 GB RAM)
2. Configure DNS: `aviqr.in` + `api.aviqr.in` → server IP
3. Install Docker, Nginx, Certbot
4. `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`
5. Build frontend: `cd aviqr-ui-web && VITE_API_URL=https://api.aviqr.in npm run build`
6. Configure Nginx to serve `dist/` + proxy to port 8080
7. `certbot --nginx -d aviqr.in -d api.aviqr.in`

---

## Tech stack

- **Backend**: Java 21, Spring Boot 3.3, Spring Cloud Gateway, Netflix Eureka, RabbitMQ
- **Frontend**: React 18, Vite 5, React Router v6, Recharts, Lucide React
- **Mobile**: Expo SDK 54, React Native, Expo Router
- **Databases**: PostgreSQL 16 (×9), MongoDB 7, Redis 7
- **Payments**: Razorpay (real SDK integration)
- **AI**: Anthropic Claude claude-sonnet-4-6 (11 features)
- **Notifications**: Twilio WhatsApp + SMS, Spring Mail

---

© 2025 AviQR Technologies · support@aviqr.in
