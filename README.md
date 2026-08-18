# AviQR — Restaurant & Hotel QR Platform

> QR-powered digital menu, live order management, 11 AI features, 9 Indian languages.
> Version 2.0 · June 2025

---

## Quick start (5 minutes, local dev)

### Prerequisites
- Java 21 (JDK)
- PostgreSQL, MongoDB, Redis, RabbitMQ (installed for you by `./aviqr.sh setup`)
- Node.js 20+
- Git

### 1. Clone and setup
```bash
git clone <your-repo-url> aviqr
cd aviqr
./aviqr.sh setup     # installs Java/Postgres/Mongo/Redis/RabbitMQ/Node (Mac via Homebrew, Ubuntu via apt)
```

### 2. Build
```bash
./aviqr.sh build     # builds all 10 backend JARs + the web bundle
```

### 3. Start backend + web together
```bash
./aviqr.sh start
# Wait ~2 minutes then verify:
curl http://localhost:8761        # Eureka dashboard
curl http://localhost:8080/actuator/health   # Should show {"status":"UP"}
```

Prefer to run backend and web separately, or a single backend service on its
own? See `./aviqr.sh help` — `aviqr-backend/aviqr.sh run <service>` and
`aviqr-ui-web/run.sh` let you run each piece individually.

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
| `ANTHROPIC_API_KEY` | Yes (for the 11 AI Hub features) | console.anthropic.com |
| `WASENDER_API_KEY` | High (WhatsApp) | wasenderapi.com dashboard |
| `TWILIO_ACCOUNT_SID` + `AUTH_TOKEN` | High (SMS campaigns only — WhatsApp moved to WaSenderAPI) | console.twilio.com |
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

See `aviqr-backend/DEPLOYMENT_NO_DOCKER.md` for the full production deployment guide
(the Docker-based `aviqr-backend/DEPLOYMENT.md` is stale — see the note below).

**CI/CD:** `.github/workflows/ci.yml` builds + tests backend/web/mobile on every push and
PR. `.github/workflows/deploy-production.yml` deploys to the production server over SSH
after CI passes on `master` (or on manual dispatch), gated by a required-reviewer approval,
with automatic health-check + rollback. One-time server/secrets setup: see
`aviqr-backend/DEPLOYMENT_NO_DOCKER.md` → PROD STEP 15.

**Quick summary (manual, first-time setup):**
1. Provision server (Ubuntu 22.04, 8 vCPU / 16 GB RAM)
2. Configure DNS: `aviqr.com` + `api.aviqr.com` → server IP
3. Install Nginx, Certbot
4. `cd aviqr-backend && ./aviqr.sh install --yes && ./aviqr.sh db-setup && ./aviqr.sh build && SPRING_PROFILES_ACTIVE=production ./aviqr.sh run all`
5. Build frontend: `cd aviqr-ui-web && VITE_API_URL=https://api.aviqr.com npm run build`
6. Configure Nginx to serve `dist/` + proxy to port 8080
7. `certbot --nginx -d aviqr.com -d api.aviqr.com`

**Important:** `./aviqr.sh run all` defaults to the `local` Spring profile (weak default JWT
secret, OTP dev-mode bypass, mock payment keys). Always set `SPRING_PROFILES_ACTIVE=production`
(and have every required var in `aviqr-backend/.env` — see below) before starting real
production traffic. For a hardened, auto-restarting setup use the systemd services in
`aviqr-backend/DEPLOYMENT_NO_DOCKER.md` instead of the bare `run all` foreground/background
process. The Docker-based `aviqr-backend/DEPLOYMENT.md` guide predates the current service
layout (references old `shop-service`/`menu-service`/`order-service`/`mall-service` names
instead of the merged `shop-mall-service`/`menu-ocr-service`/`order-qr-service` etc.) and has
no `Dockerfile`/`docker-compose.yml` in the repo yet — treat it as aspirational, not ready to run.

---

## Tech stack

- **Backend**: Java 21, Spring Boot 3.3, Spring Cloud Gateway, Netflix Eureka, RabbitMQ
- **Frontend**: React 18, Vite 5, React Router v6, Recharts, Lucide React
- **Mobile**: Expo SDK 54, React Native, Expo Router
- **Databases**: PostgreSQL 16 (×9), MongoDB 7, Redis 7
- **Payments**: Razorpay (real SDK integration)
- **AI**: Anthropic Claude claude-sonnet-4-6 (11 features)
- **Notifications**: WaSenderAPI (WhatsApp), Twilio (SMS), Spring Mail

---

© 2025 AviQR Technologies · support@aviqr.com
