# AviQR — Complete Setup Guide (NO Docker)
## Native install on Local Machine + Live Server

---

# ══════════════════════════════════════════════════════
# PART 1 — LOCAL DEVELOPMENT (No Docker)
# ══════════════════════════════════════════════════════

## What you will install natively
- Java 21 (JDK)
- Gradle 8.8
- PostgreSQL 17
- MongoDB 8.0
- Redis 7.4
- RabbitMQ 3.13
- Node.js 20+
- Your 13 Spring Boot services
- Vite dev server (frontend)

---

## ── STEP 1 — Install Java 21 ─────────────────────────

### Mac
```bash
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
java -version   # must say 21
```

### Ubuntu / Debian / Linux
```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
java -version   # must say 21
```

### Windows
```
1. Download: https://adoptium.net/temurin/releases/?version=21
   → Windows → x64 → JDK → .msi
2. Run installer (click Next all the way)
3. Open new Command Prompt:
   java -version    ← must say 21
```

---

## ── STEP 2 — Install Gradle 8.8 ─────────────────────

### Mac
```bash
brew install gradle
gradle -version   # must say 8.x
```

### Ubuntu / Linux
```bash
wget https://services.gradle.org/distributions/gradle-8.8-bin.zip -P /tmp
sudo unzip /tmp/gradle-8.8-bin.zip -d /opt/gradle
echo 'export PATH=/opt/gradle/gradle-8.8/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
gradle -version
```

### Windows
```
1. Download: https://gradle.org/releases/
   → gradle-8.8-bin.zip
2. Unzip to C:\Gradle\gradle-8.8
3. Add to PATH:
   System Properties → Environment Variables → Path → New
   → C:\Gradle\gradle-8.8\bin
4. Open new Command Prompt:
   gradle -version   ← must say 8.8
```

---

## ── STEP 3 — Install PostgreSQL 17 ──────────────────

### Mac
```bash
brew install postgresql@17
brew services start postgresql@17
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Create aviqr user and databases
psql postgres << 'SQL'
CREATE USER aviqr WITH PASSWORD 'aviqr_secret';
CREATE DATABASE aviqr_auth     OWNER aviqr;
CREATE DATABASE aviqr_shop     OWNER aviqr;
CREATE DATABASE aviqr_menu     OWNER aviqr;
CREATE DATABASE aviqr_order    OWNER aviqr;
CREATE DATABASE aviqr_payment  OWNER aviqr;
CREATE DATABASE aviqr_qr       OWNER aviqr;
CREATE DATABASE aviqr_hotel    OWNER aviqr;
CREATE DATABASE aviqr_mall     OWNER aviqr;
CREATE DATABASE aviqr_support  OWNER aviqr;
\q
SQL
```

### Ubuntu / Linux
```bash
# Add official PostgreSQL repo
sudo apt install -y curl ca-certificates
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > \
  /etc/apt/sources.list.d/pgdg.list'
sudo apt update
sudo apt install -y postgresql-17

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create user and all 9 databases
sudo -u postgres psql << 'SQL'
CREATE USER aviqr WITH PASSWORD 'aviqr_secret';
CREATE DATABASE aviqr_auth     OWNER aviqr;
CREATE DATABASE aviqr_shop     OWNER aviqr;
CREATE DATABASE aviqr_menu     OWNER aviqr;
CREATE DATABASE aviqr_order    OWNER aviqr;
CREATE DATABASE aviqr_payment  OWNER aviqr;
CREATE DATABASE aviqr_qr       OWNER aviqr;
CREATE DATABASE aviqr_hotel    OWNER aviqr;
CREATE DATABASE aviqr_mall     OWNER aviqr;
CREATE DATABASE aviqr_support  OWNER aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_auth    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_shop    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_menu    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_order   TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_payment TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_qr      TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_hotel   TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_mall    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_support TO aviqr;
\q
SQL
```

### Windows
```
1. Download: https://www.postgresql.org/download/windows/
   → Download the installer (EDB) for PostgreSQL 17
2. Run installer:
   → Password for postgres user: postgres
   → Port: 5432 (default)
   → Finish
3. Open pgAdmin (installed automatically) or use SQL Shell (psql):
   → Open SQL Shell (psql) from Start Menu
   → Press Enter for all defaults, password: postgres
   → Then run each line:
   CREATE USER aviqr WITH PASSWORD 'aviqr_secret';
   CREATE DATABASE aviqr_auth OWNER aviqr;
   CREATE DATABASE aviqr_shop OWNER aviqr;
   CREATE DATABASE aviqr_menu OWNER aviqr;
   CREATE DATABASE aviqr_order OWNER aviqr;
   CREATE DATABASE aviqr_payment OWNER aviqr;
   CREATE DATABASE aviqr_qr OWNER aviqr;
   CREATE DATABASE aviqr_hotel OWNER aviqr;
   CREATE DATABASE aviqr_mall OWNER aviqr;
   CREATE DATABASE aviqr_support OWNER aviqr;
```

**Verify PostgreSQL:**
```bash
psql -U aviqr -d aviqr_auth -c "SELECT version();"
# Should say PostgreSQL 17.x
```

---

## ── STEP 4 — Install MongoDB 8.0 ────────────────────

### Mac
```bash
brew tap mongodb/brew
brew install mongodb-community@8.0
brew services start mongodb-community@8.0

# Verify
mongosh --eval "db.adminCommand('ping')"
# Should say: { ok: 1 }
```

### Ubuntu / Linux
```bash
# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# Add repo
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongosh << 'JS'
use admin
db.createUser({
  user: "aviqr",
  pwd: "aviqr_secret",
  roles: [{ role: "root", db: "admin" }]
})
exit
JS
```

### Windows
```
1. Download: https://www.mongodb.com/try/download/community
   → Version 8.0 → Windows → .msi
2. Run installer → Complete install → Install MongoDB Compass (GUI) too
3. MongoDB starts as a Windows Service automatically
4. Open Command Prompt:
   "C:\Program Files\MongoDB\Server\8.0\bin\mongosh.exe"
   → Then create the user:
   use admin
   db.createUser({ user: "aviqr", pwd: "aviqr_secret", roles: [{ role: "root", db: "admin" }] })
```

---

## ── STEP 5 — Install Redis 7.4 ──────────────────────

### Mac
```bash
brew install redis
brew services start redis

# Verify
redis-cli ping   # should say: PONG
```

### Ubuntu / Linux
```bash
# Add Redis official repo
curl -fsSL https://packages.redis.io/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] \
  https://packages.redis.io/deb $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/redis.list

sudo apt update
sudo apt install -y redis

# Set password
sudo nano /etc/redis/redis.conf
# Find: # requirepass foobared
# Change to: requirepass aviqr_redis_secret

sudo systemctl restart redis
sudo systemctl enable redis

# Verify
redis-cli -a aviqr_redis_secret ping   # PONG
```

### Windows
```
1. Redis doesn't have an official Windows build.
   Use Windows Subsystem for Linux (WSL2):
   → Open PowerShell as Admin:
   wsl --install
   → Restart, then open Ubuntu from Start Menu
   → Follow Ubuntu steps above inside WSL

   OR use this community build:
   https://github.com/tporadowski/redis/releases
   → Download Redis-x64-5.0.14.1.msi
   → Install (runs as Windows Service)
   → redis-cli.exe ping → PONG
```

---

## ── STEP 6 — Install RabbitMQ 3.13 ─────────────────

### Mac
```bash
brew install rabbitmq
brew services start rabbitmq

# Enable management UI
/opt/homebrew/opt/rabbitmq/sbin/rabbitmq-plugins enable rabbitmq_management

# Create aviqr user
/opt/homebrew/opt/rabbitmq/sbin/rabbitmqctl add_user aviqr aviqr_secret
/opt/homebrew/opt/rabbitmq/sbin/rabbitmqctl set_user_tags aviqr administrator
/opt/homebrew/opt/rabbitmq/sbin/rabbitmqctl set_permissions -p / aviqr ".*" ".*" ".*"

# Verify: open http://localhost:15672 (aviqr / aviqr_secret)
```

### Ubuntu / Linux
```bash
# Install Erlang (required by RabbitMQ)
sudo apt install -y erlang

# Add RabbitMQ repo
curl -1sLf "https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/setup.deb.sh" | \
  sudo -E bash

sudo apt update
sudo apt install -y rabbitmq-server

# Start RabbitMQ
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Enable management UI
sudo rabbitmq-plugins enable rabbitmq_management

# Create aviqr user
sudo rabbitmqctl add_user aviqr aviqr_secret
sudo rabbitmqctl set_user_tags aviqr administrator
sudo rabbitmqctl set_permissions -p / aviqr ".*" ".*" ".*"

# Delete the default guest user (security)
sudo rabbitmqctl delete_user guest

# Verify
curl -u aviqr:aviqr_secret http://localhost:15672/api/overview | grep rabbitmq_version
```

### Windows
```
1. Install Erlang first:
   https://erlang.org/download/otp_versions_tree.html
   → Download OTP 26.x Windows 64-bit → Run installer

2. Install RabbitMQ:
   https://www.rabbitmq.com/install-windows.html
   → Download latest rabbitmq-server-3.x.x.exe → Run installer

3. Open RabbitMQ Command Prompt (from Start Menu):
   rabbitmq-plugins enable rabbitmq_management
   rabbitmqctl add_user aviqr aviqr_secret
   rabbitmqctl set_user_tags aviqr administrator
   rabbitmqctl set_permissions -p / aviqr ".*" ".*" ".*"
   rabbitmqctl delete_user guest

4. Open browser: http://localhost:15672
   Login: aviqr / aviqr_secret
```

---

## ── STEP 7 — Install Node.js 20+ ────────────────────

### Mac
```bash
brew install node@20
node -v    # v20.x.x
npm -v     # 10.x.x
```

### Ubuntu / Linux
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

### Windows
```
1. Download: https://nodejs.org → LTS (20.x)
2. Run installer → Next all the way
3. Open new Command Prompt:
   node -v    ← v20.x.x
   npm -v     ← 10.x.x
```

---

## ── STEP 8 — Extract Project Files ──────────────────

```bash
# Create project root
mkdir ~/aviqr && cd ~/aviqr

# Extract backend (from the zip you downloaded)
unzip aviqr-backend-v1.zip -d aviqr-backend

# Extract frontend
unzip aviqr-complete-v4.zip -d aviqr-ui-web

cd aviqr-backend
```

---

## ── STEP 9 — Create application-local.yml for each service ──

The services already have sensible defaults that match local installs.
If your PostgreSQL password differs, create override files:

```bash
# Create local config for auth-service
cat > auth-service/src/main/resources/application-local.yml << 'EOF'
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/aviqr_auth
    username: aviqr
    password: aviqr_secret
  data:
    mongodb:
      uri: mongodb://aviqr:aviqr_secret@localhost:27017/aviqr_logs?authSource=admin
    redis:
      host: localhost
      port: 6379
      password: aviqr_redis_secret
  rabbitmq:
    host: localhost
    port: 5672
    username: aviqr
    password: aviqr_secret
app:
  jwt:
    secret: aviqr_dev_secret_key_minimum_32_characters_here
EOF
```

> **Shortcut:** The default values in `application.yml` already match the passwords set in Steps 3–6. You don't need to do this unless you used different passwords.

---

## ── STEP 10 — Generate Gradle Wrapper ───────────────

```bash
cd ~/aviqr/aviqr-backend

gradle wrapper --gradle-version 8.8

# Mac/Linux — make executable
chmod +x ./gradlew

# Verify
./gradlew --version
```

---

## ── STEP 11 — Build All Services ────────────────────

```bash
cd ~/aviqr/aviqr-backend

# Download all dependencies and compile everything
./gradlew build -x test

# First run takes 3–5 minutes (downloads from Maven Central)
# Expected at end: BUILD SUCCESSFUL
```

---

## ── STEP 12 — Start All 13 Services ─────────────────

Each Spring Boot service runs on a **random port** and registers itself in Eureka.
Start them in this order (Service Registry → Gateway → everything else).

Open **10 separate terminal windows** or use a terminal multiplexer:

### Using tmux (Mac/Linux — recommended)
```bash
# Install tmux
brew install tmux      # Mac
sudo apt install tmux  # Linux

# Start a new tmux session
tmux new-session -s aviqr

# Create panes: Ctrl+b then " (split horizontal) or % (split vertical)
# Navigate panes: Ctrl+b then arrow keys
```

### Start order (run each in its own terminal)

```bash
# ── Terminal 1: Service Registry (FIRST — everything depends on this)
cd ~/aviqr/aviqr-backend
./gradlew service-registry:bootRun
# Wait until you see: "Started ServiceRegistryApplication on port 8761"
```

```bash
# ── Terminal 2: API Gateway (SECOND)
cd ~/aviqr/aviqr-backend
./gradlew api-gateway:bootRun
# Wait until you see: "Started ApiGatewayApplication"
```

```bash
# ── Terminal 3: Auth Service
cd ~/aviqr/aviqr-backend
./gradlew auth-service:bootRun
```

```bash
# ── Terminal 4: Shop Service
cd ~/aviqr/aviqr-backend
./gradlew shop-mall-service:bootRun
```

```bash
# ── Terminal 5: Menu Service
cd ~/aviqr/aviqr-backend
./gradlew menu-ocr-service:bootRun
```

```bash
# ── Terminal 6: Order Service
cd ~/aviqr/aviqr-backend
./gradlew order-qr-service:bootRun
```

```bash
# ── Terminal 7: Payment Service
cd ~/aviqr/aviqr-backend
./gradlew payment-service:bootRun
```

```bash
# ── Terminal 8: QR Service
cd ~/aviqr/aviqr-backend
./gradlew order-qr-service:bootRun
```

```bash
# ── Terminal 9: Notification Service
cd ~/aviqr/aviqr-backend
./gradlew notification-report-review-service:bootRun
```

```bash
# ── Terminal 10: Hotel Service
cd ~/aviqr/aviqr-backend
./gradlew hotel-service:bootRun
```

```bash
# ── Terminal 11: Mall Service
cd ~/aviqr/aviqr-backend
./gradlew shop-mall-service:bootRun
```

```bash
# ── Terminal 12: Support Service
cd ~/aviqr/aviqr-backend
./gradlew support-service:bootRun
```

```bash
# ── Terminal 13: Report Service
cd ~/aviqr/aviqr-backend
./gradlew notification-report-review-service:bootRun
```

```bash
# ── Terminal 14: OCR Service
cd ~/aviqr/aviqr-backend
./gradlew menu-ocr-service:bootRun
```

### One-liner shell script (Mac/Linux)

Save as `start-all.sh` and run instead of opening 10 terminals:

```bash
cat > ~/aviqr/aviqr-backend/start-all.sh << 'EOF'
#!/bin/bash
BASE=$(pwd)
LOG_DIR="$BASE/logs"
mkdir -p "$LOG_DIR"

start_service() {
  local name=$1
  echo "Starting $name..."
  ./gradlew ${name}:bootRun > "$LOG_DIR/${name}.log" 2>&1 &
  echo "$!" > "$LOG_DIR/${name}.pid"
}

# Start registry first, wait for it
start_service "service-registry"
echo "Waiting 20s for Eureka to start..."
sleep 20

start_service "api-gateway"
sleep 10

# Start all other services
for svc in auth-service shop-mall-service menu-ocr-service order-qr-service \
           payment-service hotel-service \
           support-service notification-report-review-service; do
  start_service "$svc"
  sleep 3
done

echo ""
echo "All services started! Logs: $LOG_DIR/"
echo "Eureka:   http://localhost:8761"
echo "API:      http://localhost:8080"
echo "RabbitMQ: http://localhost:15672"
echo ""
echo "To stop all: ./stop-all.sh"
EOF
chmod +x ~/aviqr/aviqr-backend/start-all.sh
```

```bash
cat > ~/aviqr/aviqr-backend/stop-all.sh << 'EOF'
#!/bin/bash
LOG_DIR="$(pwd)/logs"
for pid_file in "$LOG_DIR"/*.pid; do
  svc=$(basename "$pid_file" .pid)
  pid=$(cat "$pid_file")
  echo "Stopping $svc (PID $pid)..."
  kill "$pid" 2>/dev/null
  rm "$pid_file"
done
echo "All services stopped."
EOF
chmod +x ~/aviqr/aviqr-backend/stop-all.sh
```

```bash
# Start everything
cd ~/aviqr/aviqr-backend
./start-all.sh

# Watch logs
tail -f logs/auth-service.log
tail -f logs/order-qr-service.log

# Stop everything
./stop-all.sh
```

---

## ── STEP 13 — Start Frontend ─────────────────────────

```bash
cd ~/aviqr/aviqr-ui-web
npm install
npm run dev

# Open browser: http://localhost:5173
```

---

## ── STEP 14 — Verify Everything Works ───────────────

```bash
# 1. Eureka — check all 13 services registered
open http://localhost:8761          # Mac
xdg-open http://localhost:8761      # Linux
# Windows: open browser to http://localhost:8761
# Wait 60 seconds — all services should appear as UP

# 2. API Gateway health
curl http://localhost:8080/actuator/health
# {"status":"UP"}

# 3. Register and login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"surjeet@axisrooms.com","password":"Admin@1234"}'
# Returns: {"success":true,"data":{"accessToken":"eyJ..."}}

# 4. Frontend
open http://localhost:5173

# 5. RabbitMQ management
open http://localhost:15672   # aviqr / aviqr_secret
```

---

## Local Service URLs

| What | URL |
|------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:8080 |
| Eureka Dashboard | http://localhost:8761 |
| RabbitMQ UI | http://localhost:15672 |
| PostgreSQL | localhost:5432 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |
| Default admin | surjeet@axisrooms.com / Admin@1234 |

---

---

# ══════════════════════════════════════════════════════
# PART 2 — LIVE PRODUCTION SERVER (No Docker)
# ══════════════════════════════════════════════════════

## Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

**Providers (pick one):**
- **Hetzner** CPX41 (8 vCPU, 16 GB) — ~₹2,400/month ← Best value
- **DigitalOcean** 8 vCPU 16 GB — ~₹8,000/month
- **AWS** t3.xlarge — ~₹12,000/month

---

## ── PROD STEP 1 — Connect to Server ─────────────────

```bash
# From your local machine
ssh root@YOUR_SERVER_IP

# AWS with .pem key:
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_SERVER_IP
```

---

## ── PROD STEP 2 — Install All Dependencies ──────────

Run this entire block as root on the server:

```bash
apt update && apt upgrade -y

# ── Java 21 ──────────────────────────────────────────
apt install -y openjdk-21-jdk
java -version   # verify 21

# ── Gradle 8.8 ───────────────────────────────────────
wget https://services.gradle.org/distributions/gradle-8.8-bin.zip -P /tmp
unzip /tmp/gradle-8.8-bin.zip -d /opt/gradle
echo 'export PATH=/opt/gradle/gradle-8.8/bin:$PATH' >> /etc/environment
export PATH=/opt/gradle/gradle-8.8/bin:$PATH
gradle -version   # verify 8.8

# ── Node.js 20 ───────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v

# ── Nginx ────────────────────────────────────────────
apt install -y nginx
systemctl enable nginx

# ── Certbot (SSL) ────────────────────────────────────
apt install -y certbot python3-certbot-nginx

# ── PostgreSQL 17 ────────────────────────────────────
apt install -y curl ca-certificates
install -d /usr/share/postgresql-common/pgdg
curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail \
  https://www.postgresql.org/media/keys/ACCC4CF8.asc
sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > \
  /etc/apt/sources.list.d/pgdg.list'
apt update && apt install -y postgresql-17
systemctl enable postgresql
systemctl start postgresql

# ── MongoDB 8.0 ──────────────────────────────────────
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | \
  tee /etc/apt/sources.list.d/mongodb-org-8.0.list
apt update && apt install -y mongodb-org
systemctl enable mongod
systemctl start mongod

# ── Redis 7.4 ────────────────────────────────────────
curl -fsSL https://packages.redis.io/gpg | \
  gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] \
  https://packages.redis.io/deb $(lsb_release -cs) main" | \
  tee /etc/apt/sources.list.d/redis.list
apt update && apt install -y redis
systemctl enable redis

# ── RabbitMQ 3.13 ────────────────────────────────────
apt install -y erlang
curl -1sLf "https://dl.cloudsmith.io/public/rabbitmq/rabbitmq-server/setup.deb.sh" | bash
apt install -y rabbitmq-server
systemctl enable rabbitmq-server
systemctl start rabbitmq-server
rabbitmq-plugins enable rabbitmq_management

# ── Other tools ───────────────────────────────────────
apt install -y git unzip curl nano ufw

echo "All dependencies installed!"
```

---

## ── PROD STEP 3 — Configure All Services ────────────

### PostgreSQL — create user and databases

```bash
sudo -u postgres psql << 'SQL'
CREATE USER aviqr WITH PASSWORD 'YOUR_STRONG_PG_PASSWORD';
CREATE DATABASE aviqr_auth     OWNER aviqr;
CREATE DATABASE aviqr_shop     OWNER aviqr;
CREATE DATABASE aviqr_menu     OWNER aviqr;
CREATE DATABASE aviqr_order    OWNER aviqr;
CREATE DATABASE aviqr_payment  OWNER aviqr;
CREATE DATABASE aviqr_qr       OWNER aviqr;
CREATE DATABASE aviqr_hotel    OWNER aviqr;
CREATE DATABASE aviqr_mall     OWNER aviqr;
CREATE DATABASE aviqr_support  OWNER aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_auth    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_shop    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_menu    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_order   TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_payment TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_qr      TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_hotel   TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_mall    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_support TO aviqr;
\q
SQL
```

### MongoDB — create admin user

```bash
mongosh << 'JS'
use admin
db.createUser({
  user: "aviqr",
  pwd: "YOUR_STRONG_MONGO_PASSWORD",
  roles: [{ role: "root", db: "admin" }]
})
exit
JS
```

Enable MongoDB authentication:
```bash
nano /etc/mongod.conf
# Find:
#   #security:
# Change to:
#   security:
#     authorization: enabled

systemctl restart mongod
```

### Redis — set password

```bash
nano /etc/redis/redis.conf
# Find line: # requirepass foobared
# Uncomment and change to:
#   requirepass YOUR_STRONG_REDIS_PASSWORD

# Also restrict to localhost only:
# bind 127.0.0.1 ::1

systemctl restart redis
redis-cli -a YOUR_STRONG_REDIS_PASSWORD ping   # PONG
```

### RabbitMQ — create user

```bash
rabbitmqctl add_user aviqr YOUR_STRONG_RABBIT_PASSWORD
rabbitmqctl set_user_tags aviqr administrator
rabbitmqctl set_permissions -p / aviqr ".*" ".*" ".*"
rabbitmqctl delete_user guest   # remove default insecure user
```

---

## ── PROD STEP 4 — Get Code Onto the Server ───────────

**Recommended: git clone.** The CI/CD pipeline (`deploy.sh`, see PROD STEP 15)
requires `/var/www/aviqr` to be a git checkout — it deploys by `git fetch` +
`git checkout <sha>`, not by re-uploading zips.

```bash
mkdir -p /var/www/aviqr
cd /var/www/aviqr
git clone git@github.com:surjeetaxis/AviQR.git .
# (add the server's SSH key as a deploy key on the GitHub repo first:
#  Settings → Deploy keys → Add deploy key, read-only is enough)
```

<details>
<summary>Alternative: manual zip upload (no git on server, no CI/CD)</summary>

```bash
# Upload from your local machine (run this on LOCAL machine):
scp aviqr-backend-v1.zip  root@YOUR_SERVER_IP:/var/www/aviqr/
scp aviqr-complete-v4.zip root@YOUR_SERVER_IP:/var/www/aviqr/

# Back on the SERVER — extract:
cd /var/www/aviqr
unzip aviqr-backend-v1.zip  -d aviqr-backend
unzip aviqr-complete-v4.zip -d aviqr-ui-web
```

Note: this path is incompatible with `deploy.sh` / the GitHub Actions deploy
workflow, which both assume a git checkout.
</details>

---

## ── PROD STEP 5 — Configure Environment ─────────────

```bash
cat > /var/www/aviqr/aviqr-backend/.env << 'EOF'
# Generate a strong secret: openssl rand -hex 32
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING

DB_PASSWORD=YOUR_STRONG_PG_PASSWORD
MONGO_PASSWORD=YOUR_STRONG_MONGO_PASSWORD
REDIS_PASSWORD=YOUR_STRONG_REDIS_PASSWORD
RABBIT_PASSWORD=YOUR_STRONG_RABBIT_PASSWORD

RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_live_razorpay_secret

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your_gmail_app_password

GOOGLE_VISION_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

APP_BASE_URL=https://yourdomain.com
EOF

# Secure the .env file
chmod 600 /var/www/aviqr/aviqr-backend/.env
```

---

## ── PROD STEP 6 — Create Production application.yml files ──

Create one override file per service. This script does all 12 at once:

```bash
cd /var/www/aviqr/aviqr-backend

# Load environment variables
set -a && source .env && set +a

# Services that use PostgreSQL (db name = aviqr_<svc>)
PG_SERVICES="auth shop menu order payment qr hotel mall support"
# Services that use PostgreSQL with shared db (report)
# Services that use only MongoDB (notification, ocr)

for SVC in auth shop menu order payment qr hotel mall support report; do
  DB_NAME="aviqr_${SVC}"
  [ "$SVC" = "report" ] && DB_NAME="aviqr"

  cat > ${SVC}-service/src/main/resources/application-prod.yml << YEOF
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/${DB_NAME}
    username: aviqr
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
  data:
    mongodb:
      uri: mongodb://aviqr:${MONGO_PASSWORD}@localhost:27017/aviqr_logs?authSource=admin
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD}
  rabbitmq:
    host: localhost
    port: 5672
    username: aviqr
    password: ${RABBIT_PASSWORD}
app:
  jwt:
    secret: ${JWT_SECRET}
YEOF
done

# MongoDB-only services
for SVC in notification ocr; do
  cat > ${SVC}-service/src/main/resources/application-prod.yml << YEOF
spring:
  data:
    mongodb:
      uri: mongodb://aviqr:${MONGO_PASSWORD}@localhost:27017/aviqr_logs?authSource=admin
  rabbitmq:
    host: localhost
    port: 5672
    username: aviqr
    password: ${RABBIT_PASSWORD}
YEOF
done

echo "Production configs created"
```

---

## ── PROD STEP 7 — Build Backend JARs ────────────────

```bash
cd /var/www/aviqr/aviqr-backend

gradle wrapper --gradle-version 8.8
chmod +x ./gradlew

# Build all services (skip tests)
./gradlew build -x test

# Verify JARs were created
ls */build/libs/*.jar
```

---

## ── PROD STEP 8 — Create systemd Service for Each Service ──

This makes every Spring Boot service start automatically on server boot and restart on crash.

```bash
# Create a template script
cat > /var/www/aviqr/create-service.sh << 'SCRIPT'
#!/bin/bash
SVC=$1
JAR_PATH="/var/www/aviqr/aviqr-backend/${SVC}/build/libs/${SVC}-1.0.0.jar"

cat > /etc/systemd/system/aviqr-${SVC}.service << EOF
[Unit]
Description=AviQR ${SVC}
After=network.target postgresql.service mongod.service redis.service rabbitmq-server.service
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/aviqr/aviqr-backend
EnvironmentFile=/var/www/aviqr/aviqr-backend/.env
Environment=SPRING_PROFILES_ACTIVE=production
ExecStart=/usr/bin/java --enable-preview \
  -Xms256m -Xmx512m \
  -Dspring.profiles.active=production \
  -jar ${JAR_PATH}
SuccessExitStatus=143
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aviqr-${SVC}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "Created service: aviqr-${SVC}"
SCRIPT

chmod +x /var/www/aviqr/create-service.sh

# Set correct ownership
chown -R www-data:www-data /var/www/aviqr

# Create systemd service for EVERY microservice
for SVC in service-registry api-gateway auth-service shop-mall-service menu-ocr-service \
           order-qr-service payment-service \
           hotel-service support-service notification-report-review-service; do
  /var/www/aviqr/create-service.sh $SVC
done

echo "All 10 systemd services created"
```

---

## ── PROD STEP 9 — Start All Services ────────────────

```bash
# IMPORTANT: Start in this exact order!

# 1. Service Registry — everything else needs this
systemctl start aviqr-service-registry
systemctl enable aviqr-service-registry
echo "Waiting 20s for Eureka..."
sleep 20

# 2. API Gateway
systemctl start aviqr-api-gateway
systemctl enable aviqr-api-gateway
sleep 10

# 3. All microservices
for SVC in auth-service shop-mall-service menu-ocr-service order-qr-service payment-service \
           hotel-service support-service notification-report-review-service; do
  echo "Starting aviqr-${SVC}..."
  systemctl start aviqr-${SVC}
  systemctl enable aviqr-${SVC}
  sleep 5
done

# Check all are running
systemctl status aviqr-* --no-pager | grep -E "Active:|aviqr-"
```

---

## ── PROD STEP 10 — Build and Deploy Frontend ─────────

```bash
cd /var/www/aviqr/aviqr-ui-web

# Install dependencies
npm ci

# One-time only: downloads the Chromium binary `npm ci` doesn't install on
# its own, into ~/.cache/ms-playwright (persists across future `npm ci`/
# deploys — this doesn't need to run again unless that cache is cleared).
# Needed for `npm run build:prerender` below.
npx playwright install --with-deps chromium

# Set production API URL
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production

# Build — prerenders the public marketing pages to real static HTML (see
# scripts/prerender.mjs) so crawlers that don't execute JavaScript get
# actual per-page content instead of one generic index.html shell. Use
# plain `npm run build` instead if you just want a fast local/dev build.
npm run build:prerender

# The dist/ folder is your production frontend
ls -la dist/
```

---

## ── PROD STEP 11 — Set Up Nginx ─────────────────────

```bash
# Point your domain DNS BEFORE this step:
# A record: yourdomain.com    → YOUR_SERVER_IP
# A record: www.yourdomain.com → YOUR_SERVER_IP
# A record: api.yourdomain.com → YOUR_SERVER_IP

# Create Nginx config
cat > /etc/nginx/sites-available/aviqr << 'NGINX'
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

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    return 301 https://$host$request_uri;
}

# Frontend
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root  /var/www/aviqr/aviqr-ui-web/dist;
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
            proxy_pass http://127.0.0.1:8080/api/v1/menu/public/$1/html;
            break;
        }
        try_files $uri /app-shell.html;
    }

    # React Router support
    location / {
        try_files $uri $uri/ /app-shell.html;
    }

    # Cache JS/CSS/images forever (content-hashed filenames)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Never let a proxy/CDN/browser cache the service worker itself — it
    # must always be revalidated so the byte-diff update check (see
    # aviqr-ui-web/public/sw.js) fires promptly after every deploy. Without
    # this, nginx's default (no explicit directive under location /) can be
    # cached heuristically by some browsers/CDNs, delaying update detection.
    location = /sw.js {
        add_header Cache-Control "no-cache";
        expires off;
    }

    # Dynamically generated shops sitemap (every ACTIVE shop's /menu/{id}
    # page), proxied to shop-mall-service via the gateway on the same box.
    # Must be served from this origin, not api.yourdomain.com — the sitemap
    # protocol requires a sitemap to be same-host as the URLs it lists.
    location = /sitemap-shops.xml {
        proxy_pass http://127.0.0.1:8080/api/v1/sitemap/shops.xml;
        proxy_set_header Host $host;
        add_header Content-Type "application/xml";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}

# API — proxies to Spring Cloud Gateway on port 8080
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    location / {
        proxy_pass          http://127.0.0.1:8080;
        proxy_http_version  1.1;
        proxy_set_header    Host              $host;
        proxy_set_header    X-Real-IP         $remote_addr;
        proxy_set_header    X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
        proxy_set_header    Connection        "";

        proxy_read_timeout  120s;
        proxy_send_timeout  60s;
        proxy_connect_timeout 30s;

        # File upload limit for OCR
        client_max_body_size 25M;

        # CORS
        add_header 'Access-Control-Allow-Origin'  'https://yourdomain.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
NGINX

# Enable site
ln -s /etc/nginx/sites-available/aviqr /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Get free SSL certificate (Let's Encrypt)
certbot --nginx \
  -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com \
  --non-interactive --agree-tos \
  --email your@email.com

# Reload Nginx
systemctl reload nginx
```

---

## ── PROD STEP 12 — Set Up Firewall ──────────────────

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh           # Port 22
ufw allow 80/tcp        # HTTP
ufw allow 443/tcp       # HTTPS

# Block ALL internal ports from public internet
# (Nginx proxies to them internally — no direct access needed)
ufw deny 8080           # API Gateway — use api.yourdomain.com instead
ufw deny 8761           # Eureka — internal only
ufw deny 5432           # PostgreSQL — internal only
ufw deny 27017          # MongoDB — internal only
ufw deny 6379           # Redis — internal only
ufw deny 5672           # RabbitMQ AMQP — internal only
ufw deny 15672          # RabbitMQ UI — internal only

ufw enable
ufw status
```

---

## ── PROD STEP 13 — Verify Production ────────────────

```bash
# All services running?
systemctl status aviqr-* | grep -E "●|Active:"

# Eureka shows all services?
curl http://localhost:8761/eureka/apps \
  | grep -o '<appName>[^<]*</appName>' | sort

# API health
curl https://api.yourdomain.com/actuator/health
# {"status":"UP"}

# Login
curl -X POST https://api.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"surjeet@axisrooms.com","password":"Admin@1234"}'

# Frontend loads?
curl -I https://yourdomain.com
# HTTP/2 200
```

---

## ── PROD STEP 14 — Maintenance Commands ─────────────

### View logs
```bash
# One service
journalctl -u aviqr-auth-service -f
journalctl -u aviqr-order-qr-service -f --since "1 hour ago"

# All aviqr services
journalctl -u 'aviqr-*' -f

# Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Restart a service
```bash
systemctl restart aviqr-auth-service
systemctl restart aviqr-order-qr-service
```

### Redeploy after code change
```bash
# Upload new zips and re-extract, then:
cd /var/www/aviqr/aviqr-backend

./gradlew build -x test

# Restart just the changed service
systemctl restart aviqr-auth-service

# Redeploy frontend
cd /var/www/aviqr/aviqr-ui-web
npm run build:prerender
# No restart needed — Nginx serves from dist/ immediately
```

### Check service is registered in Eureka
```bash
curl -s http://localhost:8761/eureka/apps | grep -c "<appName>"
# Should say 13
```

### Database backup
```bash
# PostgreSQL — backup all
pg_dumpall -U aviqr -h localhost > /var/backups/aviqr_pg_$(date +%Y%m%d).sql

# MongoDB
mongodump --uri "mongodb://aviqr:PASSWORD@localhost:27017/aviqr_logs?authSource=admin" \
  --out /var/backups/aviqr_mongo_$(date +%Y%m%d)

# Add to cron for daily backups at 2 AM
crontab -e
# 0 2 * * * pg_dumpall -U aviqr -h localhost > /var/backups/aviqr_pg_$(date +\%Y\%m\%d).sql
```

---

## ── PROD STEP 15 — CI/CD Setup ───────────────────────

GitHub Actions workflows live at `.github/workflows/ci.yml` (build + test on
every push/PR) and `.github/workflows/deploy-production.yml` (deploys to this
server after CI passes on `master`, or on manual dispatch). The deploy job
runs `aviqr-backend/deploy/deploy.sh` over SSH — that script does the git
checkout, backend build, ordered systemd restarts, Eureka/gateway health
check, and automatic rollback to the previous commit if the health check
fails.

### 1. Create a dedicated deploy user (don't deploy as root)
```bash
adduser --disabled-password --gecos "" aviqr-deploy
usermod -aG www-data aviqr-deploy
chown -R aviqr-deploy:www-data /var/www/aviqr
```

### 2. Let it restart services without a password prompt
`deploy.sh` calls `sudo systemctl restart/is-active aviqr-*`. Scope sudo to
exactly that — not full root:
```bash
cat > /etc/sudoers.d/aviqr-deploy << 'EOF'
aviqr-deploy ALL=(root) NOPASSWD: /bin/systemctl restart aviqr-*, /bin/systemctl is-active aviqr-*, /bin/systemctl status aviqr-*
EOF
chmod 440 /etc/sudoers.d/aviqr-deploy
```

### 3. Generate an SSH keypair for GitHub Actions to use
```bash
ssh-keygen -t ed25519 -f ~/.ssh/aviqr_deploy_key -C "github-actions-deploy" -N ""
# Public key → server's authorized_keys for aviqr-deploy:
mkdir -p /home/aviqr-deploy/.ssh
cat ~/.ssh/aviqr_deploy_key.pub >> /home/aviqr-deploy/.ssh/authorized_keys
chown -R aviqr-deploy:aviqr-deploy /home/aviqr-deploy/.ssh
chmod 700 /home/aviqr-deploy/.ssh && chmod 600 /home/aviqr-deploy/.ssh/authorized_keys
```

### 4. Add GitHub repo secrets (Settings → Secrets and variables → Actions)
| Secret | Value |
|---|---|
| `PRODUCTION_SSH_HOST` | server IP or hostname |
| `PRODUCTION_SSH_USER` | `aviqr-deploy` |
| `PRODUCTION_SSH_KEY` | contents of `~/.ssh/aviqr_deploy_key` (private key) |
| `PRODUCTION_SSH_PORT` | `22` (optional — defaults to 22 if unset) |

### 5. Create the `production` Environment (Settings → Environments → New)
Add **required reviewers** so every deploy needs a manual approval click
before it touches the live server — the workflow pauses on
`environment: production` until someone approves it in the GitHub UI.

### 6. Verify
Push to `master` (or run the "Deploy to Production" workflow manually from
the Actions tab), approve the environment gate, and watch
`/var/log/aviqr-deploy.log` on the server or the Action's log for progress.
A failed health check rolls the server back to the previous commit
automatically — check `journalctl -u 'aviqr-*' -n 100` if that also fails.

---

## Quick Reference Card

### Local commands (Mac/Linux)
```bash
./start-all.sh        # start all 13 services
./stop-all.sh         # stop all
tail -f logs/auth-service.log  # watch logs
```

### Production commands
```bash
systemctl restart aviqr-auth-service       # restart one service
systemctl restart aviqr-*                  # restart all (careful!)
journalctl -u aviqr-order-qr-service -f       # live logs
nginx -t && systemctl reload nginx         # reload Nginx after config change
certbot renew                              # renew SSL (auto-renews via cron)
```

### Port reference
| Service | Local Port |
|---------|-----------|
| Eureka | 8761 |
| API Gateway | 8080 |
| Other services | Random (registered in Eureka) |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |
| RabbitMQ AMQP | 5672 |
| RabbitMQ UI | 15672 |
| Frontend dev | 5173 |
