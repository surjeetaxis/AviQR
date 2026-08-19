# AviQR — Complete Deployment Guide
## Local Development + Live Production Server

---

# PART 1 — LOCAL DEVELOPMENT SETUP

## Prerequisites — Install These First

### On Mac
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install all tools
brew install java@21 gradle node git docker
brew install --cask docker   # Docker Desktop for Mac

# Verify versions
java -version     # must say 21
gradle -version   # must say 8.x
node -version     # must say 20+
docker -version
```

### On Windows
```
1. Install Java 21 JDK:
   https://adoptium.net/temurin/releases/?version=21
   → Download Windows x64 .msi → Run installer
   → Add to PATH: C:\Program Files\Eclipse Adoptium\jdk-21\bin

2. Install Gradle:
   https://gradle.org/install/
   → Download latest binary zip → Extract to C:\Gradle
   → Add C:\Gradle\gradle-8.x\bin to PATH

3. Install Node.js 20+:
   https://nodejs.org → Download LTS → Run installer

4. Install Docker Desktop:
   https://www.docker.com/products/docker-desktop/
   → Run installer → Start Docker Desktop

5. Install Git:
   https://git-scm.com/download/win
```

### On Linux (Ubuntu/Debian)
```bash
# Java 21
sudo apt update
sudo apt install -y openjdk-21-jdk

# Gradle
wget https://services.gradle.org/distributions/gradle-8.8-bin.zip -P /tmp
sudo mkdir /opt/gradle
sudo unzip -d /opt/gradle /tmp/gradle-8.8-bin.zip
echo 'export PATH=/opt/gradle/gradle-8.8/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## Step 1 — Get the Code

```bash
# Create project folder
mkdir aviqr && cd aviqr

# Extract backend zip
unzip aviqr-backend-v1.zip -d aviqr-backend

# Extract frontend zip
unzip aviqr-complete-v4.zip -d aviqr-ui-web

cd aviqr-backend
```

---

## Step 2 — Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Open and edit .env
nano .env     # Linux/Mac
notepad .env  # Windows
```

**Minimum changes needed for local development:**
```env
# Keep these as-is for local dev:
JWT_SECRET=aviqr_super_secret_key_change_this_in_production_min_32_chars
POSTGRES_PASSWORD=aviqr_secret
MONGO_PASSWORD=aviqr_secret
REDIS_PASSWORD=aviqr_redis_secret

# Add your Razorpay TEST keys (get from https://dashboard.razorpay.com):
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_test_secret

# Leave these blank for now (OTP will print to console log):
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

---

## Step 3 — Generate Gradle Wrapper

```bash
# Run inside aviqr-backend folder
gradle wrapper --gradle-version 8.8

# Make executable (Mac/Linux only)
chmod +x ./gradlew
```

---

## Step 4 — Start Infrastructure (Docker)

```bash
# Make sure Docker Desktop is running first!

# Start databases + message broker only
docker compose up -d postgres mongo redis rabbitmq

# Wait 15 seconds for databases to initialize
sleep 15

# Verify they are running
docker compose ps

# Expected output:
# aviqr-postgres   running   0.0.0.0:5432->5432/tcp
# aviqr-mongo      running   0.0.0.0:27017->27017/tcp
# aviqr-redis      running   0.0.0.0:6379->6379/tcp
# aviqr-rabbitmq   running   0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
```

**Verify databases created:**
```bash
docker exec -it aviqr-postgres psql -U aviqr -c "\l"
# Should show: aviqr_auth, aviqr_shop, aviqr_menu, aviqr_order, aviqr_payment,
#              aviqr_qr, aviqr_hotel, aviqr_mall, aviqr_support
```

---

## Step 5 — Build All Services

```bash
# Inside aviqr-backend folder
./gradlew build -x test

# This takes 3–5 minutes on first run (downloads dependencies)
# Expected: BUILD SUCCESSFUL
```

---

## Step 6 — Start Services (Two Options)

### Option A — All via Docker Compose (Recommended for testing)

```bash
# Build Docker images for all services
docker compose build

# Start everything
docker compose up -d

# Check all 13 services are registered in Eureka
open http://localhost:8761     # Mac
xdg-open http://localhost:8761 # Linux
# Windows: open browser → http://localhost:8761

# Wait 60 seconds, then verify all appear in Eureka dashboard
```

### Option B — Run services manually (Better for development/debugging)

Open **separate terminals** for each service:

```bash
# Terminal 1 — Service Registry (start FIRST)
./gradlew service-registry:bootRun

# Wait until you see "Started ServiceRegistryApplication" then:

# Terminal 2 — API Gateway
./gradlew api-gateway:bootRun

# Terminal 3 — Auth Service
./gradlew auth-service:bootRun

# Terminal 4 — Shop Service
./gradlew shop-service:bootRun

# Terminal 5 — Menu Service
./gradlew menu-service:bootRun

# Terminal 6 — Order Service
./gradlew order-service:bootRun

# ... continue for other services as needed
```

---

## Step 7 — Start Frontend

```bash
# New terminal — go to frontend folder
cd aviqr-ui-web

# Install dependencies (first time only)
npm install

# Add API proxy so frontend talks to backend
# Edit vite.config.js:
```

Update `vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:5173
```

---

## Step 8 — Test Everything Works

```bash
# 1. Test gateway is up
curl http://localhost:8080/actuator/health

# 2. Test registration
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Owner",
    "email": "owner@test.com",
    "password": "Test@1234",
    "role": "OWNER"
  }'

# 3. Test login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aviqr.com","password":"Admin@1234"}'
# Should return accessToken

# 4. Open Eureka dashboard — all services should be green
open http://localhost:8761

# 5. Open RabbitMQ management
open http://localhost:15672
# Login: aviqr / aviqr_secret
```

---

## Local Port Reference

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API Gateway** (all APIs) | http://localhost:8080 |
| **Eureka Dashboard** | http://localhost:8761 |
| **RabbitMQ Management** | http://localhost:15672 |
| **PostgreSQL** | localhost:5432 |
| **MongoDB** | localhost:27017 |
| **Redis** | localhost:6379 |

---

## Common Local Issues & Fixes

**Port already in use:**
```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9   # Mac/Linux
netstat -ano | findstr :8080     # Windows (get PID, then: taskkill /PID xxxx /F)
```

**Eureka says service DOWN:**
```bash
# Check service logs
docker compose logs auth-service --tail=50
# Usually means DB not ready — restart the service
docker compose restart auth-service
```

**Liquibase migration error:**
```bash
# Reset a specific database
docker exec -it aviqr-postgres psql -U aviqr -c "DROP DATABASE aviqr_auth; CREATE DATABASE aviqr_auth;"
docker compose restart auth-service
```

**Out of memory:**
```bash
# Each service uses ~256MB RAM. For 13 services: ~4GB minimum
# Reduce to run only what you need:
docker compose up -d postgres mongo redis rabbitmq service-registry api-gateway auth-service shop-service menu-service order-service
```

---

---

# PART 2 — LIVE PRODUCTION SERVER

## Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**Estimated monthly cost:**
- **AWS EC2** t3.xlarge (4 vCPU, 16 GB) — ~$150/month
- **DigitalOcean** General 8 vCPU 16 GB — ~$96/month
- **Hetzner** CPX41 (8 vCPU, 16 GB) — ~$28/month ← Best value

---

## Step 1 — Provision Server

### DigitalOcean (Easiest)
```
1. Create account: https://digitalocean.com
2. Create Droplet → Ubuntu 22.04 → General Purpose → 8GB/4vCPU
3. Add SSH key during setup
4. Note the server IP address
```

### AWS EC2
```
1. Go to EC2 → Launch Instance
2. Amazon Linux 2023 or Ubuntu 22.04
3. Instance type: t3.large (minimum) or t3.xlarge
4. Configure Security Group — open ports: 22, 80, 443, 8080, 8761
5. Create and download key pair (.pem file)
```

### Hetzner (Cheapest for India traffic)
```
1. Create account: https://hetzner.com/cloud
2. Create Server → Nuremberg location → Ubuntu 22.04
3. Type: CPX31 (4 vCPU, 8 GB) or CPX41 (8 vCPU, 16 GB)
4. Add your SSH key
```

---

## Step 2 — Initial Server Setup

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Or with key file (AWS):
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Install Docker Compose
apt install -y docker-compose-plugin

# Install Java 21
apt install -y openjdk-21-jdk

# Install Gradle
wget https://services.gradle.org/distributions/gradle-8.8-bin.zip -P /tmp
mkdir /opt/gradle
unzip -d /opt/gradle /tmp/gradle-8.8-bin.zip
echo 'export PATH=/opt/gradle/gradle-8.8/bin:$PATH' >> /etc/environment
source /etc/environment

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Certbot (free SSL)
apt install -y certbot python3-certbot-nginx

# Install Git
apt install -y git unzip curl

# Verify
java -version
docker -v
docker compose version
```

---

## Step 3 — Upload Your Code

### Option A — Git (Recommended)
```bash
# On your server
mkdir -p /var/www/aviqr
cd /var/www/aviqr

# If you have a Git repo:
git clone https://github.com/yourname/aviqr-backend.git
git clone https://github.com/yourname/aviqr-ui-web.git
```

### Option B — Upload zip files via SCP
```bash
# Run this on YOUR LOCAL MACHINE (not server)
scp aviqr-backend-v1.zip root@YOUR_SERVER_IP:/tmp/
scp aviqr-complete-v4.zip root@YOUR_SERVER_IP:/tmp/

# Then on the server:
mkdir -p /var/www/aviqr
cd /var/www/aviqr
unzip /tmp/aviqr-backend-v1.zip -d aviqr-backend
unzip /tmp/aviqr-complete-v4.zip -d aviqr-ui-web
```

---

## Step 4 — Configure DNS

Point your domain to the server. In your domain registrar (GoDaddy / Namecheap / Cloudflare):

```
Type    Name         Value
A       @            YOUR_SERVER_IP      → aviqr.com
A       www          YOUR_SERVER_IP      → www.aviqr.com
A       api          YOUR_SERVER_IP      → api.aviqr.com
```

Wait 5–30 minutes for DNS to propagate, then:
```bash
ping aviqr.com   # should show your server IP
```

---

## Step 5 — Production Environment File

```bash
cd /var/www/aviqr/aviqr-backend
cp .env.example .env
nano .env
```

Fill in **ALL values** for production:
```env
# CRITICAL — change this to a random 64-character string
JWT_SECRET=$(openssl rand -hex 32)

# Database passwords — use strong passwords!
POSTGRES_PASSWORD=Str0ng_PG_P@ssw0rd_2024!
MONGO_PASSWORD=Str0ng_M0ngo_P@ss_2024!
REDIS_PASSWORD=Str0ng_R3dis_P@ss_2024!

# Razorpay LIVE keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_razorpay_secret

# Twilio for SMS OTP
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1415xxxxxxx

# SMTP for emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@aviqr.com
SMTP_PASSWORD=your_app_specific_password

# Google Vision for OCR
GOOGLE_VISION_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your actual domain
APP_BASE_URL=https://aviqr.com
FRONTEND_URL=https://aviqr.com
```

---

## Step 6 — Production Docker Compose Override

Create `/var/www/aviqr/aviqr-backend/docker-compose.prod.yml`:

```yaml
version: '3.9'

services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /var/data/aviqr/postgres:/var/lib/postgresql/data

  mongo:
    restart: always
    volumes:
      - /var/data/aviqr/mongo:/data/db

  redis:
    restart: always
    volumes:
      - /var/data/aviqr/redis:/data

  rabbitmq:
    restart: always

  service-registry:
    restart: always

  api-gateway:
    restart: always
    environment:
      JWT_SECRET: ${JWT_SECRET}

  auth-service:
    restart: always
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      SPRING_DATA_MONGODB_URI: mongodb://aviqr:${MONGO_PASSWORD}@mongo:27017/aviqr_logs?authSource=admin
      SPRING_DATA_REDIS_PASSWORD: ${REDIS_PASSWORD}

  shop-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}

  menu-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}

  order-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}

  payment-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      RAZORPAY_KEY_ID: ${RAZORPAY_KEY_ID}
      RAZORPAY_KEY_SECRET: ${RAZORPAY_KEY_SECRET}

  hotel-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}

  mall-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}

  support-service:
    restart: always
    environment:
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
```

---

## Step 7 — Build Backend for Production

```bash
cd /var/www/aviqr/aviqr-backend

# Generate Gradle wrapper
gradle wrapper --gradle-version 8.8
chmod +x ./gradlew

# Build all JARs (skip tests for speed)
./gradlew build -x test

# Build Docker images
docker compose -f docker-compose.yml -f docker-compose.prod.yml build

# Create data directories (persistent volumes)
mkdir -p /var/data/aviqr/{postgres,mongo,redis}
```

---

## Step 8 — Build Frontend for Production

```bash
cd /var/www/aviqr/aviqr-ui-web

# Install dependencies
npm ci

# One-time only: downloads the Chromium binary `npm ci` doesn't install on
# its own, into ~/.cache/ms-playwright (persists across future `npm ci`/
# deploys). Needed for `npm run build:prerender` below.
npx playwright install --with-deps chromium

# Update API URL in frontend
# Edit src/context/AuthContext.jsx or create a .env.production file
echo "VITE_API_URL=https://api.aviqr.com" > .env.production

# Build — prerenders the public marketing pages to real static HTML (see
# scripts/prerender.mjs) so crawlers that don't execute JavaScript get
# actual per-page content instead of one generic index.html shell.
npm run build:prerender

# dist/ folder is now ready to serve
ls dist/
```

---

## Step 9 — Configure Nginx

```bash
# Create Nginx config
nano /etc/nginx/sites-available/aviqr
```

Paste this complete Nginx config:
```nginx
# Marks known AI/search crawler User-Agents so /menu/{shopId} can serve them
# real static HTML instead of the client-rendered SPA shell — see the
# location block below and menu-ocr-service's MenuController.getPublicMenuHtml.
# Must live outside any server{} block (nginx requires map at http level;
# this file is `include`d from within http{} in nginx.conf, so top-level
# here still resolves correctly).
map $http_user_agent $is_seo_crawler {
    default 0;
    ~*GPTBot 1;
    ~*ChatGPT-User 1;
    ~*OAI-SearchBot 1;
    ~*ClaudeBot 1;
    ~*Claude-Web 1;
    ~*anthropic-ai 1;
    ~*PerplexityBot 1;
    ~*Perplexity-User 1;
    ~*Google-Extended 1;
    ~*Applebot-Extended 1;
    ~*Amazonbot 1;
    ~*Meta-ExternalAgent 1;
    ~*CCBot 1;
    ~*Googlebot 1;
    ~*bingbot 1;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name aviqr.com www.aviqr.com api.aviqr.com;
    return 301 https://$host$request_uri;
}

# Main frontend — aviqr.com
server {
    listen 443 ssl http2;
    server_name aviqr.com www.aviqr.com;

    ssl_certificate     /etc/letsencrypt/live/aviqr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aviqr.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /var/www/aviqr/aviqr-ui-web/dist;
    index index.html;

    # Shop menu pages are client-rendered (React), so a crawler that
    # doesn't execute JavaScript sees an empty shell no matter what SEO
    # tags the page declares. Known crawler UAs (see the map above) get
    # real server-rendered HTML from menu-ocr-service instead; everyone
    # else gets the normal interactive app. A single `if` with one
    # proxy_pass+break is the documented-safe exception to nginx's usual
    # "if is evil" guidance (no branching logic beyond this).
    location ~ ^/menu/([0-9a-fA-F-]+)$ {
        if ($is_seo_crawler = 1) {
            proxy_pass http://localhost:8080/api/v1/menu/public/$1/html;
            break;
        }
        try_files $uri /app-shell.html;
    }

    # React Router — serve index.html for all routes.
    # $uri/index.html, not $uri/ — the prerendered marketing pages (see
    # scripts/prerender.mjs) are real directories now (dist/features/,
    # dist/faq/, ...), and $uri/ makes nginx treat a bare /features request
    # as a directory match, which triggers its own 301-to-trailing-slash
    # redirect before ever reaching this try_files. Referencing the file
    # directly serves it in one hop, with no redirect.
    location / {
        try_files $uri $uri/index.html /app-shell.html;
    }

    # Cache static assets
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Dynamically generated shops sitemap, proxied to shop-mall-service via
    # the gateway on this same box. Must be served from this origin, not
    # api.aviqr.com — the sitemap protocol requires a sitemap to be
    # same-host as the URLs it lists.
    location = /sitemap-shops.xml {
        proxy_pass http://localhost:8080/api/v1/sitemap/shops.xml;
        proxy_set_header Host $host;
        add_header Content-Type "application/xml";
    }

    # iOS Universal Links verification file has no extension by spec, so
    # nginx's default mime.types lookup can't identify it — without this,
    # it's served as application/octet-stream, and some iOS versions
    # refuse to trust the association file unless it's application/json.
    location = /.well-known/apple-app-site-association {
        default_type application/json;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
}

# API Gateway — api.aviqr.com
server {
    listen 443 ssl http2;
    server_name api.aviqr.com;

    ssl_certificate     /etc/letsencrypt/live/aviqr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aviqr.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Forward all API calls to Spring Cloud Gateway
    location / {
        proxy_pass          http://localhost:8080;
        proxy_http_version  1.1;
        proxy_set_header    Host              $host;
        proxy_set_header    X-Real-IP         $remote_addr;
        proxy_set_header    X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
        proxy_set_header    Connection        "";

        # Timeouts for long-running requests
        proxy_read_timeout  120s;
        proxy_connect_timeout 30s;

        # Upload limit (for OCR file uploads)
        client_max_body_size 25M;

        # CORS headers
        add_header Access-Control-Allow-Origin  "https://aviqr.com" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

```bash
# Enable the site
ln -s /etc/nginx/sites-available/aviqr /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Get SSL certificates (free via Let's Encrypt)
certbot --nginx -d aviqr.com -d www.aviqr.com -d api.aviqr.com \
  --non-interactive --agree-tos -m your@email.com

# Reload Nginx
systemctl reload nginx
systemctl enable nginx
```

---

## Step 10 — Launch Production

```bash
cd /var/www/aviqr/aviqr-backend

# Load environment
set -a && source .env && set +a

# Start infrastructure first
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d postgres mongo redis rabbitmq

# Wait for databases
sleep 20

# Start service registry
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d service-registry

sleep 15

# Start gateway
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d api-gateway

sleep 10

# Start all microservices
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d auth-service shop-service menu-service order-service \
       payment-service qr-service notification-service hotel-service \
       mall-service support-service report-service ocr-service

# Verify all services are up
docker compose ps

# Check Eureka (all 13 services should appear in ~60 seconds)
curl http://localhost:8761/eureka/apps | grep -o '<appName>[^<]*</appName>'
```

---

## Step 11 — Verify Live Site

```bash
# 1. Frontend loads
curl -I https://aviqr.com
# Expected: HTTP/2 200

# 2. API gateway health
curl https://api.aviqr.com/actuator/health
# Expected: {"status":"UP"}

# 3. Test login
curl -X POST https://api.aviqr.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aviqr.com","password":"Admin@1234"}'
# Expected: {"success":true,"data":{"accessToken":"eyJ..."}}

# 4. Open browser
# https://aviqr.com → Frontend
# https://api.aviqr.com/actuator/health → API health
```

---

## Step 12 — Auto-start on Server Reboot

```bash
# Create systemd service
nano /etc/systemd/system/aviqr.service
```

```ini
[Unit]
Description=AviQR Backend Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/var/www/aviqr/aviqr-backend
EnvironmentFile=/var/www/aviqr/aviqr-backend/.env
ExecStart=/usr/bin/docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable aviqr
systemctl start aviqr

# Verify
systemctl status aviqr
```

---

## Monitoring & Maintenance

### View logs
```bash
# All services
docker compose logs -f --tail=100

# Specific service
docker compose logs -f auth-service
docker compose logs -f order-service

# Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Update code and redeploy
```bash
cd /var/www/aviqr/aviqr-backend

# Pull latest code
git pull

# Rebuild
./gradlew build -x test
docker compose build auth-service shop-service   # rebuild specific services

# Rolling restart (zero downtime)
docker compose up -d --no-deps auth-service
docker compose up -d --no-deps shop-service

# Frontend update
cd /var/www/aviqr/aviqr-ui-web
git pull && npm ci && npm run build:prerender
# No restart needed — Nginx serves from dist/ directly
```

### Database backup
```bash
# Backup all PostgreSQL databases
docker exec aviqr-postgres pg_dumpall -U aviqr > /var/backups/aviqr_pg_$(date +%Y%m%d).sql

# Backup MongoDB
docker exec aviqr-mongo mongodump --username aviqr --password aviqr_secret \
  --authenticationDatabase admin --out /tmp/mongodump
docker cp aviqr-mongo:/tmp/mongodump /var/backups/aviqr_mongo_$(date +%Y%m%d)

# Schedule daily backups via cron
crontab -e
# Add this line:
# 0 2 * * * /var/www/aviqr/backup.sh >> /var/log/aviqr_backup.log 2>&1
```

### Scale services
```bash
# Scale order-service to 5 replicas
docker compose up -d --scale order-service=5 --no-recreate

# Scale down
docker compose up -d --scale order-service=2 --no-recreate
```

---

## Firewall Setup (UFW)

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp       # SSH
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw deny 8080          # Block direct API access (use Nginx)
ufw deny 8761          # Block Eureka from public
ufw deny 5432          # Block Postgres from public
ufw deny 27017         # Block Mongo from public
ufw deny 6379          # Block Redis from public
ufw deny 15672         # Block RabbitMQ management from public
ufw enable

# Verify
ufw status
```

---

## Quick Reference — All Commands

| Task | Command |
|------|---------|
| Start everything locally | `docker compose up -d` |
| Stop everything | `docker compose down` |
| View logs | `docker compose logs -f` |
| Restart one service | `docker compose restart auth-service` |
| Open Eureka | http://localhost:8761 |
| Open RabbitMQ | http://localhost:15672 (aviqr/aviqr_secret) |
| Connect to Postgres | `docker exec -it aviqr-postgres psql -U aviqr` |
| Connect to Mongo | `docker exec -it aviqr-mongo mongosh -u aviqr -p aviqr_secret` |
| Build backend | `./gradlew build -x test` |
| Start frontend | `npm run dev` |
| Build frontend | `npm run build:prerender` |
| Check server health | `curl http://localhost:8080/actuator/health` |
| Admin login | admin@aviqr.com / Admin@1234 |
