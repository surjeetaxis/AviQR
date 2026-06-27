-- ============================================================
--  AviQR OS — Complete Database Setup
--  PostgreSQL 17+
--  Run as superuser: psql -U postgres -f aviqr_setup.sql
--
--  Databases created: aviqr_auth, aviqr_shop, aviqr_menu, aviqr_order,
--                      aviqr_payment, aviqr_qr, aviqr_hotel, aviqr_mall,
--                      aviqr_support, aviqr_report, aviqr_review  (11 total)
--
--  Includes hand-written demo records (Spice Route, Coconut Grove, etc.)
--  plus a bulk-generated block of 100+ customers and 100+ orders
--  (with matching order_items) — see SECTION 13.
--
--  Marketplace additions: Seller Tier System (shops.tier + rating/sales
--  columns), Product Ranking (menu_items.ranking_score + rating/seo
--  columns), a reviews table (aviqr_review), and a report_snapshots
--  table (aviqr_report) — see SECTION 11/12.
-- ============================================================

-- ============================================================
--  SECTION 1 — CREATE DATABASES & USER
-- ============================================================

-- Create the application user
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aviqr') THEN
    CREATE USER aviqr WITH PASSWORD 'aviqr_secret';
  END IF;
END $$;

-- Create all 10 service databases
CREATE DATABASE aviqr_auth     OWNER aviqr;
CREATE DATABASE aviqr_shop     OWNER aviqr;
CREATE DATABASE aviqr_menu     OWNER aviqr;
CREATE DATABASE aviqr_order    OWNER aviqr;
CREATE DATABASE aviqr_payment  OWNER aviqr;
CREATE DATABASE aviqr_qr       OWNER aviqr;
CREATE DATABASE aviqr_hotel    OWNER aviqr;
CREATE DATABASE aviqr_mall     OWNER aviqr;
CREATE DATABASE aviqr_support  OWNER aviqr;
CREATE DATABASE aviqr_report   OWNER aviqr;
CREATE DATABASE aviqr_review   OWNER aviqr;

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE aviqr_auth    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_shop    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_menu    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_order   TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_payment TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_qr      TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_hotel   TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_mall    TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_support TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_report  TO aviqr;
GRANT ALL PRIVILEGES ON DATABASE aviqr_review  TO aviqr;


-- ============================================================
--  SECTION 2 — aviqr_auth
-- ============================================================
\connect aviqr_auth

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE users (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email              VARCHAR(255) NOT NULL UNIQUE,
    phone              VARCHAR(15)  UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
    name               VARCHAR(255) NOT NULL,
    role               VARCHAR(30)  NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    avatar             VARCHAR(500),
    shop_id            VARCHAR(100),
    hotel_id           VARCHAR(100),
    mall_id            VARCHAR(100),
    brand_id           VARCHAR(100),
    email_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    phone_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    preferred_language VARCHAR(5)   DEFAULT 'en',
    fcm_token          VARCHAR(500),
    created_at         TIMESTAMP    DEFAULT NOW(),
    updated_at         TIMESTAMP    DEFAULT NOW(),
    last_login_at      TIMESTAMP
);

CREATE INDEX idx_users_email  ON users (email);
CREATE INDEX idx_users_phone  ON users (phone);
CREATE INDEX idx_users_role   ON users (role);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_shop_id ON users (shop_id);

-- ── otp_records ──────────────────────────────────────────────
CREATE TABLE otp_records (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    target     VARCHAR(255) NOT NULL,
    otp        VARCHAR(255) NOT NULL,
    type       VARCHAR(30)  NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    used       BOOLEAN      DEFAULT FALSE,
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_otp_target     ON otp_records (target);
CREATE INDEX idx_otp_expires_at ON otp_records (expires_at);

-- ── refresh_tokens ───────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    token      VARCHAR(500) NOT NULL UNIQUE,
    user_id    UUID         NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    revoked    BOOLEAN      DEFAULT FALSE,
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_refresh_user_id   ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_expires   ON refresh_tokens (expires_at);
CREATE INDEX idx_refresh_revoked   ON refresh_tokens (revoked);

-- ── Sequence for order_number style references ────────────────
CREATE SEQUENCE seq_user_ref START 1001 INCREMENT 1;

-- ── Dummy data — users ────────────────────────────────────────
-- Passwords are all: Test@1234  (bcrypt $2a$12$)
INSERT INTO users (id, email, phone, password_hash, name, role, status, avatar, shop_id, email_verified, phone_verified, preferred_language, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@aviqr.in',        '9999000001', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Priya Mehta',       'ADMIN',    'ACTIVE', 'PM', NULL,                                 TRUE,  TRUE,  'en', NOW() - INTERVAL '180 days'),
  ('00000000-0000-0000-0000-000000000002', 'support@aviqr.in',      '9999000002', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Arjun Nair',        'SUPPORT',    'ACTIVE', 'AN', NULL,                                 TRUE,  TRUE,  'en', NOW() - INTERVAL '150 days'),
  ('00000000-0000-0000-0000-000000000003', 'sujeet@spiceroute.in',  '9845012345', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Sujeet Narayanan',  'OWNER',    'ACTIVE', 'SN', '00000000-0000-0000-0000-000000000101', TRUE,  TRUE,  'kn', NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000004', 'meena@coconut.in',      '9876500001', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Meena Pillai',      'OWNER',    'ACTIVE', 'MP', '00000000-0000-0000-0000-000000000102', TRUE,  TRUE,  'ml', NOW() - INTERVAL '80 days'),
  ('00000000-0000-0000-0000-000000000005', 'farhan@biryani.in',     '9988776600', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Farhan Khan',       'OWNER',    'SUSPENDED','FK', '00000000-0000-0000-0000-000000000103', TRUE,  TRUE,  'hi', NOW() - INTERVAL '70 days'),
  ('00000000-0000-0000-0000-000000000006', 'gm@grandpalace.in',     '8011223344', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Grand Palace Hotel','HOTEL',    'ACTIVE', 'GP', NULL,                                 TRUE,  TRUE,  'en', NOW() - INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000007', 'admin@forum.in',        '7700112233', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Forum Mall Admin',  'MALL',     'ACTIVE', 'FM', NULL,                                 TRUE,  FALSE, 'en', NOW() - INTERVAL '50 days'),
  ('00000000-0000-0000-0000-000000000008', 'ramesh@teas.in',        '9988776655', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Ramesh Enterprises','SUPPLIER', 'ACTIVE', 'RE', NULL,                                 TRUE,  TRUE,  'hi', NOW() - INTERVAL '120 days'),
  ('00000000-0000-0000-0000-000000000009', 'vikram@gmail.com',      '9900112233', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Vikram Sharma',     'MANAGER',  'ACTIVE', 'VS', '00000000-0000-0000-0000-000000000101', TRUE,  TRUE,  'en', NOW() - INTERVAL '60 days'),
  ('00000000-0000-0000-0000-000000000010', 'anjali@gmail.com',      '9876543210', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Anjali Singh',      'CUSTOMER', 'ACTIVE', 'AS', NULL,                                 TRUE,  TRUE,  'hi', NOW() - INTERVAL '30 days'),
  ('00000000-0000-0000-0000-000000000011', 'ravi@gmail.com',        '9123456789', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Ravi Kumar',        'CUSTOMER', 'ACTIVE', 'RK', NULL,                                 FALSE, FALSE, 'ta', NOW() - INTERVAL '15 days'),
  ('00000000-0000-0000-0000-000000000012', 'priya@cake.in',         '9900001122', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Priya Menon',       'OWNER',    'ACTIVE', 'PM', '00000000-0000-0000-0000-000000000104', TRUE,  TRUE,  'ml', NOW() - INTERVAL '45 days'),
  ('00000000-0000-0000-0000-000000000013', 'kitchen@spiceroute.in', '9845012346', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Chef Rangan',       'KITCHEN',  'ACTIVE', 'CR', '00000000-0000-0000-0000-000000000101', TRUE,  TRUE,  'kn', NOW() - INTERVAL '45 days'),
  ('00000000-0000-0000-0000-000000000014', 'cashier@spiceroute.in', '9845012347', '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u', 'Deepa Cashier',     'CASHIER',  'ACTIVE', 'DC', '00000000-0000-0000-0000-000000000101', TRUE,  TRUE,  'en', NOW() - INTERVAL '30 days');

INSERT INTO otp_records (id, target, otp, type, expires_at, used, created_at) VALUES
  (gen_random_uuid(), '9845012345', '$2a$12$abc123', 'PHONE_LOGIN', NOW() + INTERVAL '10 minutes', FALSE, NOW()),
  (gen_random_uuid(), '9876543210', '$2a$12$def456', 'PHONE_LOGIN', NOW() - INTERVAL '20 minutes', TRUE,  NOW() - INTERVAL '25 minutes');


-- ============================================================
--  SECTION 3 — aviqr_shop
-- ============================================================
\connect aviqr_shop

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── shops ─────────────────────────────────────────────────────
CREATE TABLE shops (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255)  NOT NULL,
    tagline           VARCHAR(500),
    owner_id          VARCHAR(100),
    phone             VARCHAR(20),
    email             VARCHAR(255),
    address           TEXT,
    city              VARCHAR(100),
    state             VARCHAR(100),
    pincode           VARCHAR(10),
    logo_url          VARCHAR(1000),
    latitude          DECIMAL(10,8),
    longitude         DECIMAL(11,8),
    gstin             VARCHAR(20),
    subscription_plan VARCHAR(50)   DEFAULT 'STARTER',
    min_order_amount  INTEGER,
    table_count       INTEGER,
    status            VARCHAR(20)   DEFAULT 'ACTIVE',
    -- ── Seller Tier System ──────────────────────────────────
    rating              DECIMAL(3,2)  DEFAULT 0,
    rating_count        INTEGER       DEFAULT 0,
    completion_rate     DECIMAL(5,2)  DEFAULT 0,
    sales_volume        DECIMAL(14,2) DEFAULT 0,
    return_percentage   DECIMAL(5,2)  DEFAULT 0,
    satisfaction_score  DECIMAL(5,2)  DEFAULT 0,
    tier                VARCHAR(20)   DEFAULT 'NEW',
    tier_updated_at     TIMESTAMP,
    created_at        TIMESTAMP     DEFAULT NOW(),
    updated_at        TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops (owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_city     ON shops (city);
CREATE INDEX IF NOT EXISTS idx_shops_status   ON shops (status);
CREATE INDEX IF NOT EXISTS idx_shops_tier     ON shops (tier);

-- Seller Tier System columns — ADD COLUMN IF NOT EXISTS so this also upgrades
-- a `shops` table that already existed before this feature was added.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating              DECIMAL(3,2)  DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS rating_count        INTEGER       DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS completion_rate     DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS sales_volume        DECIMAL(14,2) DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS return_percentage   DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS satisfaction_score  DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tier                VARCHAR(20)   DEFAULT 'NEW';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tier_updated_at      TIMESTAMP;

-- ── shop_opening_hours ────────────────────────────────────────
CREATE TABLE shop_opening_hours (
    shop_id    UUID,
    day_of_week VARCHAR(15),
    open       BOOLEAN DEFAULT TRUE,
    open_time  VARCHAR(10),
    close_time VARCHAR(10)
);

CREATE INDEX idx_opening_hours_shop ON shop_opening_hours (shop_id);

-- ── shop_staff ────────────────────────────────────────────────
CREATE TABLE shop_staff (
    id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id   UUID         NOT NULL,
    user_id   VARCHAR(100),
    name      VARCHAR(255) NOT NULL,
    phone     VARCHAR(20),
    email     VARCHAR(255),
    avatar    VARCHAR(10),
    role      VARCHAR(30)  DEFAULT 'CASHIER',
    active    BOOLEAN      DEFAULT TRUE,
    joined_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_staff_shop_id ON shop_staff (shop_id);
CREATE INDEX idx_staff_role    ON shop_staff (role);

-- ── staff_permissions ─────────────────────────────────────────
CREATE TABLE staff_permissions (
    shop_staff_id UUID,
    permissions   VARCHAR(100)
);

-- ── shop_settings ─────────────────────────────────────────────
CREATE TABLE shop_settings (
    shop_id                 UUID         PRIMARY KEY,
    razorpay_key_id         VARCHAR(100),
    razorpay_key_secret     VARCHAR(255),
    phone_pe_merchant_id    VARCHAR(100),
    cash_enabled            BOOLEAN      DEFAULT TRUE,
    online_enabled          BOOLEAN      DEFAULT TRUE,
    wallet_enabled          BOOLEAN      DEFAULT FALSE,
    smtp_host               VARCHAR(255),
    smtp_user               VARCHAR(255),
    smtp_password           VARCHAR(255),
    twilio_sid              VARCHAR(100),
    twilio_token            VARCHAR(100),
    whatsapp_api_key        VARCHAR(255),
    fcm_server_key          VARCHAR(255),
    loyalty_enabled         BOOLEAN      DEFAULT FALSE,
    loyalty_points_per_rupee INTEGER     DEFAULT 1,
    loyalty_redemption_rate  INTEGER     DEFAULT 100,
    tax_percent             DECIMAL(5,2) DEFAULT 5,
    gstin                   VARCHAR(20),
    business_name           VARCHAR(255)
);

-- ── Sequence for shop reference numbers ──────────────────────
CREATE SEQUENCE seq_shop_ref START 1001 INCREMENT 1;

-- ── Dummy data — shops ────────────────────────────────────────
INSERT INTO shops (id, name, tagline, owner_id, phone, email, address, city, state, pincode, gstin, subscription_plan, min_order_amount, table_count, status, latitude, longitude, created_at) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Spice Route',        'Authentic South Indian flavours',  '00000000-0000-0000-0000-000000000003', '9845012345', 'hello@spiceroute.in', '12, MG Road, Indiranagar',       'Bengaluru', 'Karnataka',       '560038', '29AABCU9603R1ZM', 'GROWTH',   100, 12, 'ACTIVE',   12.97194, 77.64115, NOW() - INTERVAL '90 days'),
  ('00000000-0000-0000-0000-000000000102', 'The Coconut Grove',  'Kerala cuisine at its finest',      '00000000-0000-0000-0000-000000000004', '9876500001', 'hello@coconut.in',    '45, Marine Drive, Fort Kochi',   'Kochi',     'Kerala',           '682001', '32AADFC1234R1ZM', 'BUSINESS', 150, 20, 'ACTIVE',   9.93988,  76.26022, NOW() - INTERVAL '80 days'),
  ('00000000-0000-0000-0000-000000000103', 'Biryani House',      'Hyderabadi dum biryani specialists','00000000-0000-0000-0000-000000000005', '9988776600', 'hello@biryani.in',    '78, Linking Road, Bandra',       'Mumbai',    'Maharashtra',      '400050', '27AABFB5678R1ZM', 'GROWTH',   200, 8,  'SUSPENDED',19.05972,  72.83569, NOW() - INTERVAL '70 days'),
  ('00000000-0000-0000-0000-000000000104', 'Cake Studio',        'Artisanal cakes & desserts',        '00000000-0000-0000-0000-000000000012', '9900001122', 'hello@cakestudio.in', '23, Connaught Place',            'Delhi',     'Delhi',            '110001', '07AABCC9012R1ZM', 'STARTER',  50,  4,  'ACTIVE',   28.63287,  77.21988, NOW() - INTERVAL '45 days'),
  ('00000000-0000-0000-0000-000000000105', 'Chai & Chaat',       'Street food with a twist',          '00000000-0000-0000-0000-000000000003', '9845099999', 'hello@chaichaat.in',  '5, FC Road, Shivajinagar',       'Pune',      'Maharashtra',      '411004', '27AABFC3456R1ZM', 'STARTER',  80,  6,  'ACTIVE',   18.51957,  73.85535, NOW() - INTERVAL '30 days');

-- Seller tier seed values (until the nightly recalculation job runs)
UPDATE shops SET rating=4.7, rating_count=312, completion_rate=97.50, sales_volume=486200.00, return_percentage=1.20, satisfaction_score=94.00, tier='GOLD',   tier_updated_at=NOW() WHERE id='00000000-0000-0000-0000-000000000101';
UPDATE shops SET rating=4.4, rating_count=198, completion_rate=95.10, sales_volume=312500.00, return_percentage=2.10, satisfaction_score=89.00, tier='SILVER', tier_updated_at=NOW() WHERE id='00000000-0000-0000-0000-000000000102';
UPDATE shops SET rating=3.6, rating_count=54,  completion_rate=82.00, sales_volume=98400.00,  return_percentage=6.80, satisfaction_score=71.00, tier='BRONZE', tier_updated_at=NOW() WHERE id='00000000-0000-0000-0000-000000000103';
UPDATE shops SET rating=4.1, rating_count=27,  completion_rate=91.00, sales_volume=45200.00,  return_percentage=3.00, satisfaction_score=82.00, tier='BRONZE', tier_updated_at=NOW() WHERE id='00000000-0000-0000-0000-000000000104';
UPDATE shops SET rating=0,   rating_count=0,   completion_rate=0,     sales_volume=8600.00,   return_percentage=0,    satisfaction_score=0,     tier='NEW',    tier_updated_at=NOW() WHERE id='00000000-0000-0000-0000-000000000105';

-- Opening hours for Spice Route (all days)
INSERT INTO shop_opening_hours (shop_id, day_of_week, open, open_time, close_time) VALUES
  ('00000000-0000-0000-0000-000000000101', 'MONDAY',    TRUE, '10:00', '22:30'),
  ('00000000-0000-0000-0000-000000000101', 'TUESDAY',   TRUE, '10:00', '22:30'),
  ('00000000-0000-0000-0000-000000000101', 'WEDNESDAY',  TRUE, '10:00', '22:30'),
  ('00000000-0000-0000-0000-000000000101', 'THURSDAY',  TRUE, '10:00', '22:30'),
  ('00000000-0000-0000-0000-000000000101', 'FRIDAY',    TRUE, '10:00', '23:00'),
  ('00000000-0000-0000-0000-000000000101', 'SATURDAY',  TRUE, '10:00', '23:00'),
  ('00000000-0000-0000-0000-000000000101', 'SUNDAY',    TRUE, '11:00', '22:00');

-- Staff for Spice Route
INSERT INTO shop_staff (id, shop_id, user_id, name, phone, email, avatar, role, active) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000009', 'Vikram Sharma',  '9900112233', 'vikram@gmail.com',      'VS', 'MANAGER',  TRUE),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000013', 'Chef Rangan',    '9845012346', 'kitchen@spiceroute.in', 'CR', 'KITCHEN',  TRUE),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000014', 'Deepa Cashier',  '9845012347', 'cashier@spiceroute.in', 'DC', 'CASHIER',  TRUE),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000009', 'Anoop Waiter',   '9876500010', 'anoop@coconut.in',      'AW', 'ORDER_VIEWER', TRUE);

INSERT INTO staff_permissions (shop_staff_id, permissions) VALUES
  ('00000000-0000-0000-0000-000000000201', 'VIEW_ORDERS'),
  ('00000000-0000-0000-0000-000000000201', 'UPDATE_ORDER_STATUS'),
  ('00000000-0000-0000-0000-000000000201', 'VIEW_REPORTS'),
  ('00000000-0000-0000-0000-000000000202', 'VIEW_ORDERS'),
  ('00000000-0000-0000-0000-000000000202', 'UPDATE_ORDER_STATUS'),
  ('00000000-0000-0000-0000-000000000203', 'VIEW_ORDERS'),
  ('00000000-0000-0000-0000-000000000203', 'ACCEPT_PAYMENT');

INSERT INTO shop_settings (shop_id, cash_enabled, online_enabled, wallet_enabled, tax_percent, loyalty_enabled, loyalty_points_per_rupee, business_name) VALUES
  ('00000000-0000-0000-0000-000000000101', TRUE, TRUE, TRUE,  5.00, TRUE,  1, 'Spice Route Restaurant Pvt Ltd'),
  ('00000000-0000-0000-0000-000000000102', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'The Coconut Grove Foods'),
  ('00000000-0000-0000-0000-000000000103', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'Biryani House Mumbai'),
  ('00000000-0000-0000-0000-000000000104', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'Cake Studio Delhi'),
  ('00000000-0000-0000-0000-000000000105', TRUE, FALSE,FALSE, 5.00, FALSE, 1, 'Chai and Chaat Pune');


-- ============================================================
--  SECTION 4 — aviqr_menu
-- ============================================================
\connect aviqr_menu

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── categories ───────────────────────────────────────────────
CREATE TABLE categories (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    name_hi    VARCHAR(255),
    name_ta    VARCHAR(255),
    name_te    VARCHAR(255),
    name_kn    VARCHAR(255),
    name_ml    VARCHAR(255),
    name_bn    VARCHAR(255),
    name_mr    VARCHAR(255),
    name_gu    VARCHAR(255),
    emoji      VARCHAR(10),
    shop_id    VARCHAR(100) NOT NULL,
    sort_order INTEGER      DEFAULT 0,
    active     BOOLEAN      DEFAULT TRUE
);

CREATE INDEX idx_categories_shop_id ON categories (shop_id);
CREATE INDEX idx_categories_active  ON categories (active);

-- ── menu_items ────────────────────────────────────────────────
CREATE TABLE menu_items (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(255)  NOT NULL,
    name_hi        VARCHAR(255),
    name_ta        VARCHAR(255),
    name_te        VARCHAR(255),
    description    TEXT,
    description_hi TEXT,
    category_id    UUID          NOT NULL,
    shop_id        VARCHAR(100)  NOT NULL,
    price          DECIMAL(10,2) NOT NULL,
    image_url      VARCHAR(1000),
    veg            BOOLEAN       DEFAULT TRUE,
    spicy          BOOLEAN       DEFAULT FALSE,
    popular        BOOLEAN       DEFAULT FALSE,
    available      BOOLEAN       DEFAULT TRUE,
    tag            VARCHAR(50),
    sort_order     INTEGER       DEFAULT 0,
    -- ── Product Ranking ──────────────────────────────────────
    slug            VARCHAR(280),
    rating          DECIMAL(3,2)  DEFAULT 0,
    rating_count    INTEGER       DEFAULT 0,
    seo_score       DECIMAL(5,2)  DEFAULT 0,
    conversion_rate DECIMAL(5,2)  DEFAULT 0,
    sales_volume    INTEGER       DEFAULT 0,
    ranking_score   DECIMAL(8,2)  DEFAULT 0,
    created_at     TIMESTAMP     DEFAULT NOW(),
    updated_at     TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_shop_id       ON menu_items (shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id   ON menu_items (category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available     ON menu_items (available);
CREATE INDEX IF NOT EXISTS idx_menu_items_veg           ON menu_items (veg);
CREATE INDEX IF NOT EXISTS idx_menu_items_ranking_score ON menu_items (ranking_score DESC);

-- Product Ranking columns — ADD COLUMN IF NOT EXISTS so this also upgrades a
-- `menu_items` table that already existed before this feature was added.
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS slug            VARCHAR(280);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS rating          DECIMAL(3,2)  DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS rating_count    INTEGER       DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS seo_score       DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2)  DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS sales_volume    INTEGER       DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS ranking_score   DECIMAL(8,2)  DEFAULT 0;

-- ── pricing_rules ─────────────────────────────────────────────
CREATE TABLE pricing_rules (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id          VARCHAR(100)  NOT NULL,
    name             VARCHAR(255)  NOT NULL,
    type             VARCHAR(30),
    from_time        TIME,
    to_time          TIME,
    days_of_week     VARCHAR(200),
    from_date        DATE,
    to_date          DATE,
    adjustment_type  VARCHAR(30),
    adjustment_value DECIMAL(10,2),
    priority         INTEGER       DEFAULT 1,
    active           BOOLEAN       DEFAULT TRUE
);

CREATE INDEX idx_pricing_shop_id ON pricing_rules (shop_id);
CREATE INDEX idx_pricing_active  ON pricing_rules (active);

-- ── Sequences ─────────────────────────────────────────────────
CREATE SEQUENCE seq_category_sort START 1 INCREMENT 1;
CREATE SEQUENCE seq_item_sort     START 1 INCREMENT 1;

-- ── Dummy data — categories (Spice Route) ────────────────────
INSERT INTO categories (id, name, name_hi, name_ta, name_kn, emoji, shop_id, sort_order, active) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Starters',       'स्टार्टर',    'தொடக்க உணவுகள்', 'ಸ್ಟಾರ್ಟರ್‌ಗಳು', '🥗', '00000000-0000-0000-0000-000000000101', 1, TRUE),
  ('00000000-0000-0000-0001-000000000002', 'Main Course',    'मुख्य कोर्स', 'முக்கிய உணவு',   'ಮುಖ್ಯ ಕೋರ್ಸ್',   '🍛', '00000000-0000-0000-0000-000000000101', 2, TRUE),
  ('00000000-0000-0000-0001-000000000003', 'Breads',         'रोटी',         'ரொட்டிகள்',       'ರೊಟ್ಟಿಗಳು',       '🫓', '00000000-0000-0000-0000-000000000101', 3, TRUE),
  ('00000000-0000-0000-0001-000000000004', 'Rice & Biryani', 'चावल बिरयानी', 'அரிசி & பிரியாணி','ಅಕ್ಕಿ ಮತ್ತು ಬಿರ್ಯಾನಿ','🍚', '00000000-0000-0000-0000-000000000101', 4, TRUE),
  ('00000000-0000-0000-0001-000000000005', 'Desserts',       'मिठाई',        'இனிப்புகள்',       'ಸಿಹಿತಿಂಡಿಗಳು',   '🍮', '00000000-0000-0000-0000-000000000101', 5, TRUE),
  ('00000000-0000-0000-0001-000000000006', 'Beverages',      'पेय पदार्थ',   'பானங்கள்',         'ಪಾನೀಯಗಳು',        '🥤', '00000000-0000-0000-0000-000000000101', 6, TRUE),
  ('00000000-0000-0000-0001-000000000007', 'Soups',          'सूप',          'சூப்கள்',          'ಸೂಪ್‌ಗಳು',        '🍲', '00000000-0000-0000-0000-000000000101', 7, TRUE);

-- Coconut Grove categories
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  ('00000000-0000-0000-0001-000000000011', 'Kerala Starters', '🌴', '00000000-0000-0000-0000-000000000102', 1, TRUE),
  ('00000000-0000-0000-0001-000000000012', 'Seafood',         '🦐', '00000000-0000-0000-0000-000000000102', 2, TRUE),
  ('00000000-0000-0000-0001-000000000013', 'Kerala Mains',    '🍛', '00000000-0000-0000-0000-000000000102', 3, TRUE),
  ('00000000-0000-0000-0001-000000000014', 'Drinks',          '🥥', '00000000-0000-0000-0000-000000000102', 4, TRUE);

-- ── Dummy data — menu_items (Spice Route) ────────────────────
INSERT INTO menu_items (id, name, name_hi, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  -- Starters
  ('00000000-0000-0000-0002-000000000001', 'Paneer Tikka',             'पनीर टिक्का',       'Marinated cottage cheese grilled in tandoor with bell peppers',               '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000101', 280.00, TRUE,  FALSE, TRUE,  TRUE,  'bestseller', 1),
  ('00000000-0000-0000-0002-000000000002', 'Veg Seekh Kebab',          'वेज सीख कबाब',     'Mixed vegetable and paneer kebabs on skewers',                                '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000101', 220.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  ('00000000-0000-0000-0002-000000000003', 'Chicken Tikka',            'चिकन टिक्का',      'Tender chicken marinated in yoghurt and spices, char-grilled',                '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000101', 320.00, FALSE, TRUE,  TRUE,  TRUE,  'spicy',      3),
  ('00000000-0000-0000-0002-000000000004', 'Samosa (2 pcs)',           'समोसा',             'Crispy fried pastry with spiced potato and pea filling',                      '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000101', 80.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         4),
  ('00000000-0000-0000-0002-000000000005', 'Mushroom Pepper Fry',      'मशरूम पेपर फ्राय', 'Sautéed button mushrooms tossed with black pepper and herbs',                 '00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000101', 240.00, TRUE,  TRUE,  FALSE, TRUE,  'new',        5),
  -- Main Course
  ('00000000-0000-0000-0002-000000000006', 'Paneer Butter Masala',     'पनीर बटर मसाला',   'Rich creamy tomato-cashew gravy with soft paneer cubes',                      '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000101', 320.00, TRUE,  FALSE, TRUE,  TRUE,  'bestseller', 1),
  ('00000000-0000-0000-0002-000000000007', 'Dal Makhani',              'दाल मखनी',         'Black lentils slow-cooked overnight in butter and cream',                     '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000101', 280.00, TRUE,  FALSE, TRUE,  TRUE,  'bestseller', 2),
  ('00000000-0000-0000-0002-000000000008', 'Butter Chicken',           'बटर चिकन',         'Tender chicken in a velvety tomato-butter sauce',                             '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000101', 380.00, FALSE, FALSE, TRUE,  TRUE,  'bestseller', 3),
  ('00000000-0000-0000-0002-000000000009', 'Palak Paneer',             'पालक पनीर',        'Cottage cheese in smooth spinach gravy',                                      '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000101', 300.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         4),
  ('00000000-0000-0000-0002-000000000010', 'Chicken Kadai',            'चिकन कढ़ाई',       'Chicken cooked with kadai spices, capsicum and tomatoes',                     '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000101', 360.00, FALSE, TRUE,  FALSE, TRUE,  'spicy',      5),
  ('00000000-0000-0000-0002-000000000011', 'Shahi Paneer',             'शाही पनीर',        'Paneer in rich Mughlai gravy with cashews and cream',                         '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000101', 340.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         6),
  -- Breads
  ('00000000-0000-0000-0002-000000000012', 'Butter Naan',              'बटर नान',          'Soft leavened bread baked in tandoor, brushed with butter',                   '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000101', 55.00,  TRUE,  FALSE, TRUE,  TRUE,  NULL,         1),
  ('00000000-0000-0000-0002-000000000013', 'Garlic Naan',              'गार्लिक नान',      'Naan topped with fresh garlic and coriander',                                 '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000101', 65.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  ('00000000-0000-0000-0002-000000000014', 'Laccha Paratha',           'लच्छा पराठा',      'Multi-layered crispy whole wheat paratha',                                    '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000101', 60.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         3),
  ('00000000-0000-0000-0002-000000000015', 'Tandoori Roti',            'तंदूरी रोटी',      'Whole wheat bread baked in clay oven',                                        '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000101', 40.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         4),
  -- Rice & Biryani
  ('00000000-0000-0000-0002-000000000016', 'Veg Dum Biryani',          'वेज दम बिरयानी',  'Fragrant basmati rice layered with vegetables and whole spices',              '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000101', 260.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         1),
  ('00000000-0000-0000-0002-000000000017', 'Chicken Biryani',          'चिकन बिरयानी',    'Hyderabadi-style dum biryani with tender chicken',                            '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000101', 360.00, FALSE, TRUE,  TRUE,  TRUE,  'bestseller', 2),
  ('00000000-0000-0000-0002-000000000018', 'Jeera Rice',               'जीरा राइस',        'Basmati rice tempered with cumin seeds and ghee',                             '00000000-0000-0000-0001-000000000004', '00000000-0000-0000-0000-000000000101', 120.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         3),
  -- Desserts
  ('00000000-0000-0000-0002-000000000019', 'Gulab Jamun (2 pcs)',      'गुलाब जामुन',     'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup',              '00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000101', 90.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         1),
  ('00000000-0000-0000-0002-000000000020', 'Kulfi Falooda',            'कुल्फी फालूदा',   'Dense Indian ice cream with falooda noodles and rose syrup',                  '00000000-0000-0000-0001-000000000005', '00000000-0000-0000-0000-000000000101', 140.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  -- Beverages
  ('00000000-0000-0000-0002-000000000021', 'Masala Chai',              'मसाला चाय',        'Freshly brewed spiced Indian tea with milk',                                  '00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000101', 40.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         1),
  ('00000000-0000-0000-0002-000000000022', 'Sweet Lassi',              'मीठी लस्सी',      'Chilled yoghurt drink sweetened with sugar and rose water',                   '00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000101', 80.00,  TRUE,  FALSE, TRUE,  TRUE,  NULL,         2),
  ('00000000-0000-0000-0002-000000000023', 'Fresh Lime Soda',          'नींबू सोडा',       'Freshly squeezed lime with soda, salted or sweet',                            '00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000101', 60.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         3),
  ('00000000-0000-0000-0002-000000000024', 'Mango Lassi',              'मैंगो लस्सी',     'Thick yoghurt blended with fresh Alphonso mango pulp',                        '00000000-0000-0000-0001-000000000006', '00000000-0000-0000-0000-000000000101', 100.00, TRUE,  FALSE, FALSE, TRUE,  'seasonal',   4);

-- Coconut Grove menu items
INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000031', 'Prawn Koliwada',   'Crispy fried prawns with coastal spices',                  '00000000-0000-0000-0001-000000000011', '00000000-0000-0000-0000-000000000102', 360.00, FALSE, TRUE,  TRUE,  TRUE,  'bestseller', 1),
  ('00000000-0000-0000-0002-000000000032', 'Kerala Fish Curry','Traditional fish curry in coconut milk and kudampuli',      '00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-000000000102', 420.00, FALSE, TRUE,  TRUE,  TRUE,  'bestseller', 1),
  ('00000000-0000-0000-0002-000000000033', 'Appam',            'Soft lacy rice hoppers served with stew',                  '00000000-0000-0000-0001-000000000013', '00000000-0000-0000-0000-000000000102', 80.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  ('00000000-0000-0000-0002-000000000034', 'Tender Coconut',   'Fresh tender coconut water straight from the shell',       '00000000-0000-0000-0001-000000000014', '00000000-0000-0000-0000-000000000102', 80.00,  TRUE,  FALSE, TRUE,  TRUE,  NULL,         1),
  ('00000000-0000-0000-0002-000000000035', 'Nannari Sherbet',  'Refreshing Indian sarsaparilla syrup with lemon',          '00000000-0000-0000-0001-000000000014', '00000000-0000-0000-0000-000000000102', 60.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         2);

-- Biryani House categories + menu items
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  ('00000000-0000-0000-0001-000000000021', 'Biryani',  '🍚', '00000000-0000-0000-0000-000000000103', 1, TRUE),
  ('00000000-0000-0000-0001-000000000022', 'Starters', '🍢', '00000000-0000-0000-0000-000000000103', 2, TRUE);

INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000041', 'Hyderabadi Chicken Dum Biryani', 'Slow-cooked dum biryani with tender chicken and saffron rice', '00000000-0000-0000-0001-000000000021', '00000000-0000-0000-0000-000000000103', 320.00, FALSE, TRUE,  TRUE,  TRUE, 'bestseller', 1),
  ('00000000-0000-0000-0002-000000000042', 'Mutton Biryani',                'Rich mutton biryani layered with caramelised onions',           '00000000-0000-0000-0001-000000000021', '00000000-0000-0000-0000-000000000103', 380.00, FALSE, TRUE,  TRUE,  TRUE, 'bestseller', 2),
  ('00000000-0000-0000-0002-000000000043', 'Veg Biryani',                   'Basmati rice dum-cooked with mixed vegetables',                  '00000000-0000-0000-0001-000000000021', '00000000-0000-0000-0000-000000000103', 240.00, TRUE,  FALSE, FALSE, TRUE, NULL,         3),
  ('00000000-0000-0000-0002-000000000044', 'Egg Biryani',                   'Boiled eggs simmered in spiced dum biryani rice',                '00000000-0000-0000-0001-000000000021', '00000000-0000-0000-0000-000000000103', 220.00, FALSE, TRUE,  FALSE, TRUE, NULL,         4),
  ('00000000-0000-0000-0002-000000000045', 'Chicken 65',                    'Deep-fried spicy Chettinad-style chicken bites',                 '00000000-0000-0000-0001-000000000022', '00000000-0000-0000-0000-000000000103', 260.00, FALSE, TRUE,  TRUE,  TRUE, NULL,         1),
  ('00000000-0000-0000-0002-000000000046', 'Mirchi Ka Salan',               'Tangy peanut-sesame curry with green chillies',                  '00000000-0000-0000-0001-000000000022', '00000000-0000-0000-0000-000000000103', 180.00, TRUE,  TRUE,  FALSE, TRUE, NULL,         2);

-- Cake Studio categories + menu items
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  ('00000000-0000-0000-0001-000000000031', 'Cakes',     '🎂', '00000000-0000-0000-0000-000000000104', 1, TRUE),
  ('00000000-0000-0000-0001-000000000032', 'Pastries',  '🧁', '00000000-0000-0000-0000-000000000104', 2, TRUE),
  ('00000000-0000-0000-0001-000000000033', 'Beverages', '🥤', '00000000-0000-0000-0000-000000000104', 3, TRUE);

INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000051', 'Chocolate Truffle Cake (1kg)', 'Rich chocolate sponge layered with truffle ganache',     '00000000-0000-0000-0001-000000000031', '00000000-0000-0000-0000-000000000104', 850.00, TRUE, FALSE, TRUE,  TRUE, 'bestseller', 1),
  ('00000000-0000-0000-0002-000000000052', 'Red Velvet Cake (1kg)',        'Classic red velvet with cream cheese frosting',           '00000000-0000-0000-0001-000000000031', '00000000-0000-0000-0000-000000000104', 950.00, TRUE, FALSE, TRUE,  TRUE, 'bestseller', 2),
  ('00000000-0000-0000-0002-000000000053', 'Black Forest Cake (1kg)',      'Whipped cream cake with cherries and chocolate shavings',  '00000000-0000-0000-0001-000000000031', '00000000-0000-0000-0000-000000000104', 800.00, TRUE, FALSE, FALSE, TRUE, NULL,         3),
  ('00000000-0000-0000-0002-000000000054', 'Blueberry Cheesecake (slice)', 'Baked cheesecake topped with blueberry compote',          '00000000-0000-0000-0001-000000000032', '00000000-0000-0000-0000-000000000104', 180.00, TRUE, FALSE, TRUE,  TRUE, NULL,         1),
  ('00000000-0000-0000-0002-000000000055', 'Croissant',                    'Buttery, flaky French-style croissant',                   '00000000-0000-0000-0001-000000000032', '00000000-0000-0000-0000-000000000104', 90.00,  TRUE, FALSE, FALSE, TRUE, NULL,         2),
  ('00000000-0000-0000-0002-000000000056', 'Chocolate Brownie',            'Dense fudgy brownie with walnuts',                        '00000000-0000-0000-0001-000000000032', '00000000-0000-0000-0000-000000000104', 120.00, TRUE, FALSE, TRUE,  TRUE, NULL,         3),
  ('00000000-0000-0000-0002-000000000057', 'Cold Coffee',                  'Blended iced coffee topped with cream',                   '00000000-0000-0000-0001-000000000033', '00000000-0000-0000-0000-000000000104', 140.00, TRUE, FALSE, FALSE, TRUE, NULL,         1),
  ('00000000-0000-0000-0002-000000000058', 'Hot Chocolate',                'Rich Belgian hot chocolate with marshmallows',            '00000000-0000-0000-0001-000000000033', '00000000-0000-0000-0000-000000000104', 130.00, TRUE, FALSE, FALSE, TRUE, NULL,         2);

-- Chai & Chaat categories + menu items
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  ('00000000-0000-0000-0001-000000000041', 'Chaat',  '🥙', '00000000-0000-0000-0000-000000000105', 1, TRUE),
  ('00000000-0000-0000-0001-000000000042', 'Chai',   '☕', '00000000-0000-0000-0000-000000000105', 2, TRUE),
  ('00000000-0000-0000-0001-000000000043', 'Snacks', '🍟', '00000000-0000-0000-0000-000000000105', 3, TRUE);

INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  ('00000000-0000-0000-0002-000000000061', 'Pani Puri (6 pcs)',  'Crispy puris filled with spiced tangy water and potato',  '00000000-0000-0000-0001-000000000041', '00000000-0000-0000-0000-000000000105', 60.00,  TRUE, TRUE,  TRUE,  TRUE, 'bestseller', 1),
  ('00000000-0000-0000-0002-000000000062', 'Bhel Puri',          'Puffed rice tossed with chutneys, onion and sev',          '00000000-0000-0000-0001-000000000041', '00000000-0000-0000-0000-000000000105', 70.00,  TRUE, FALSE, TRUE,  TRUE, NULL,         2),
  ('00000000-0000-0000-0002-000000000063', 'Sev Puri',           'Crisp puris topped with potato, chutneys and sev',         '00000000-0000-0000-0001-000000000041', '00000000-0000-0000-0000-000000000105', 65.00,  TRUE, FALSE, FALSE, TRUE, NULL,         3),
  ('00000000-0000-0000-0002-000000000064', 'Masala Chai',        'Freshly brewed spiced tea with milk',                      '00000000-0000-0000-0001-000000000042', '00000000-0000-0000-0000-000000000105', 25.00,  TRUE, FALSE, TRUE,  TRUE, 'bestseller', 1),
  ('00000000-0000-0000-0002-000000000065', 'Ginger Chai',        'Strong tea brewed with fresh ginger',                      '00000000-0000-0000-0001-000000000042', '00000000-0000-0000-0000-000000000105', 30.00,  TRUE, TRUE,  FALSE, TRUE, NULL,         2),
  ('00000000-0000-0000-0002-000000000066', 'Cutting Chai',       'Half-portion strong tea, Mumbai railway-station style',    '00000000-0000-0000-0001-000000000042', '00000000-0000-0000-0000-000000000105', 15.00,  TRUE, FALSE, FALSE, TRUE, NULL,         3),
  ('00000000-0000-0000-0002-000000000067', 'Vada Pav',           'Spiced potato fritter in a bun with chutneys',             '00000000-0000-0000-0001-000000000043', '00000000-0000-0000-0000-000000000105', 35.00,  TRUE, TRUE,  TRUE,  TRUE, 'bestseller', 1),
  ('00000000-0000-0000-0002-000000000068', 'Samosa Chaat',       'Crushed samosa topped with yoghurt, chutneys and sev',     '00000000-0000-0000-0001-000000000043', '00000000-0000-0000-0000-000000000105', 80.00,  TRUE, FALSE, FALSE, TRUE, NULL,         2);

-- Product Ranking seed: SEO-friendly slug for every item, generated from name
UPDATE menu_items SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9 ]', '', 'g'), '\s+', '-', 'g'));

-- Product Ranking seed: ratings + ranking score, weighted higher for items
-- tagged 'bestseller' / marked popular (until the nightly job recalculates)
UPDATE menu_items SET rating=4.6, rating_count=210, seo_score=82, conversion_rate=18.5, sales_volume=860, ranking_score=91.2 WHERE tag='bestseller';
UPDATE menu_items SET rating=4.2, rating_count=64,  seo_score=68, conversion_rate=11.0, sales_volume=240, ranking_score=58.4 WHERE popular = TRUE AND tag IS DISTINCT FROM 'bestseller';
UPDATE menu_items SET rating=3.8, rating_count=15,  seo_score=45, conversion_rate=5.5,  sales_volume=60,  ranking_score=31.0 WHERE rating = 0;

-- Pricing rules
INSERT INTO pricing_rules (id, shop_id, name, type, from_time, to_time, adjustment_type, adjustment_value, priority, active) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000101', 'Happy Hours (3–6 PM)',  'TIME', '15:00', '18:00', 'PERCENTAGE_DECREASE', 10.00, 1, TRUE),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000101', 'Weekend Surcharge',    'DAY',  NULL,    NULL,    'PERCENTAGE_INCREASE',  5.00,  2, TRUE);

UPDATE pricing_rules SET days_of_week = '["SATURDAY","SUNDAY"]'
  WHERE id = '00000000-0000-0000-0003-000000000002';


-- ============================================================
--  SECTION 5 — aviqr_order
-- ============================================================
\connect aviqr_order

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── orders ────────────────────────────────────────────────────
CREATE TABLE orders (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number   VARCHAR(50)   NOT NULL UNIQUE,
    shop_id        VARCHAR(100)  NOT NULL,
    customer_id    VARCHAR(100),
    customer_name  VARCHAR(255)  NOT NULL,
    customer_phone VARCHAR(20),
    table_number   VARCHAR(10),
    type           VARCHAR(20)   DEFAULT 'DINE_IN',
    status         VARCHAR(20)   DEFAULT 'NEW',
    payment_method VARCHAR(20)   DEFAULT 'ONLINE',
    payment_status VARCHAR(20)   DEFAULT 'PENDING',
    payment_id     VARCHAR(100),
    subtotal       DECIMAL(10,2) NOT NULL,
    tax            DECIMAL(10,2) DEFAULT 0,
    total_amount   DECIMAL(10,2) NOT NULL,
    notes          TEXT,
    created_at     TIMESTAMP     DEFAULT NOW(),
    updated_at     TIMESTAMP     DEFAULT NOW(),
    accepted_at    TIMESTAMP,
    completed_at   TIMESTAMP
);

CREATE INDEX idx_orders_shop_id     ON orders (shop_id);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_status      ON orders (status);
CREATE INDEX idx_orders_created_at  ON orders (created_at DESC);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);

-- ── order_items ───────────────────────────────────────────────
CREATE TABLE order_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID          NOT NULL,
    menu_item_id UUID          NOT NULL,
    item_name    VARCHAR(255)  NOT NULL,
    quantity     INTEGER       NOT NULL,
    unit_price   DECIMAL(10,2) NOT NULL,
    total_price  DECIMAL(10,2) NOT NULL,
    notes        TEXT
);

ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order_id
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE;

CREATE INDEX idx_order_items_order_id    ON order_items (order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items (menu_item_id);

-- ── Sequence for order numbers ────────────────────────────────
CREATE SEQUENCE seq_order_number START 100001 INCREMENT 1 CACHE 20;

-- ── Dummy data — orders ───────────────────────────────────────
INSERT INTO orders (id, order_number, shop_id, customer_id, customer_name, customer_phone, table_number, type, status, payment_method, payment_status, payment_id, subtotal, tax, total_amount, notes, created_at, accepted_at, completed_at) VALUES
  ('00000000-0000-0000-0004-000000000001', 'ORD-1001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   '9876543210', '4',  'DINE_IN',  'COMPLETED', 'ONLINE', 'PAID',    'pay_Abc123xyz001', 685.00,  34.25, 719.25,  NULL,             NOW() - INTERVAL '2 hours', NOW() - INTERVAL '115 min', NOW() - INTERVAL '90 min'),
  ('00000000-0000-0000-0004-000000000002', 'ORD-1002', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', 'Ravi Kumar',     '9123456789', '7',  'DINE_IN',  'COMPLETED', 'CASH',   'CASH',    NULL,               760.00,  38.00, 798.00,  NULL,             NOW() - INTERVAL '3 hours', NOW() - INTERVAL '175 min', NOW() - INTERVAL '150 min'),
  ('00000000-0000-0000-0004-000000000003', 'ORD-1003', '00000000-0000-0000-0000-000000000101', NULL,                                  'Deepak Joshi',   '9988001122', '2',  'DINE_IN',  'PREPARING', 'ONLINE', 'PAID',    'pay_Def456ghi002', 600.00,  30.00, 630.00,  'Less spicy',     NOW() - INTERVAL '20 min', NOW() - INTERVAL '15 min', NULL),
  ('00000000-0000-0000-0004-000000000004', 'ORD-1004', '00000000-0000-0000-0000-000000000101', NULL,                                  'Sneha Reddy',    '9900445566', '9',  'DINE_IN',  'NEW',       'ONLINE', 'PAID',    'pay_Ghi789jkl003', 440.00,  22.00, 462.00,  NULL,             NOW() - INTERVAL '5 min',  NULL,                       NULL),
  ('00000000-0000-0000-0004-000000000005', 'ORD-1005', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   '9876543210', '4',  'DINE_IN',  'READY',     'ONLINE', 'PAID',    'pay_Jkl012mno004', 320.00,  16.00, 336.00,  NULL,             NOW() - INTERVAL '35 min', NOW() - INTERVAL '30 min', NULL),
  ('00000000-0000-0000-0004-000000000006', 'ORD-1006', '00000000-0000-0000-0000-000000000101', NULL,                                  'Mohan Verma',    '9900887766', NULL, 'TAKEAWAY', 'COMPLETED', 'ONLINE', 'PAID',    'pay_Mno345pqr005', 380.00,  19.00, 399.00,  NULL,             NOW() - INTERVAL '4 hours', NOW() - INTERVAL '235 min', NOW() - INTERVAL '220 min'),
  ('00000000-0000-0000-0004-000000000007', 'ORD-1007', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   '9876543210', '3',  'DINE_IN',  'COMPLETED', 'ONLINE', 'PAID',    'pay_Pqr678stu006', 500.00,  25.00, 525.00,  NULL,             NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day',  NOW() - INTERVAL '23 hours'),
  ('00000000-0000-0000-0004-000000000008', 'ORD-1008', '00000000-0000-0000-0000-000000000101', NULL,                                  'Karan Malhotra', '9811223344', '1',  'DINE_IN',  'ACCEPTED',  'CASH',   'PENDING', NULL,               840.00,  42.00, 882.00,  'Extra chapati',  NOW() - INTERVAL '25 min', NOW() - INTERVAL '20 min', NULL);

INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price) VALUES
  -- Order 1
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000006', 'Paneer Butter Masala', 1, 320.00, 320.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000012', 'Butter Naan',          3,  55.00, 165.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000022', 'Sweet Lassi',          2,  80.00, 160.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000019', 'Gulab Jamun (2 pcs)',  1,  90.00,  90.00),
  -- Order 2
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000008', 'Butter Chicken',       1, 380.00, 380.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000017', 'Chicken Biryani',      1, 360.00, 360.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000021', 'Masala Chai',          2,  40.00,  80.00),
  -- Order 3
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000001', 'Paneer Tikka',         1, 280.00, 280.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000007', 'Dal Makhani',          1, 280.00, 280.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000015', 'Tandoori Roti',        1,  40.00,  40.00),
  -- Order 4
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0002-000000000006', 'Paneer Butter Masala', 1, 320.00, 320.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0002-000000000013', 'Garlic Naan',          2,  65.00, 130.00),
  -- Order 5
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0002-000000000008', 'Butter Chicken',       1, 380.00, 380.00),
  -- Order 8
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0002-000000000010', 'Chicken Kadai',        1, 360.00, 360.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0002-000000000007', 'Dal Makhani',          1, 280.00, 280.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0002-000000000012', 'Butter Naan',          4,  55.00, 220.00);

-- Orders for Biryani House, Cake Studio, Chai & Chaat (so every active shop
-- has at least one order to exercise the order/payment/review flow)
INSERT INTO orders (id, order_number, shop_id, customer_id, customer_name, customer_phone, table_number, type, status, payment_method, payment_status, payment_id, subtotal, tax, total_amount, notes, created_at, accepted_at, completed_at) VALUES
  ('00000000-0000-0000-0004-000000000009', 'ORD-1009', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000011', 'Ravi Kumar',     '9123456789', '2',  'DINE_IN',  'COMPLETED', 'ONLINE', 'PAID',    'pay_Stu901vwx007', 700.00, 35.00, 735.00, NULL,            NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0004-000000000010', 'ORD-1010', '00000000-0000-0000-0000-000000000103', NULL,                                  'Suresh Babu',    '9900112200', NULL, 'TAKEAWAY', 'COMPLETED', 'CASH',   'CASH',    NULL,               260.00, 13.00, 273.00, NULL,            NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
  ('00000000-0000-0000-0004-000000000011', 'ORD-1011', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   '9876543210', NULL, 'TAKEAWAY', 'COMPLETED', 'ONLINE', 'PAID',    'pay_Yza234bcd008', 850.00, 42.50, 892.50, 'Birthday cake', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0004-000000000012', 'ORD-1012', '00000000-0000-0000-0000-000000000104', NULL,                                  'Nisha Kapoor',   '9911223344', NULL, 'TAKEAWAY', 'NEW',       'ONLINE', 'PAID',    'pay_Efg567hij009', 300.00, 15.00, 315.00, NULL,            NOW() - INTERVAL '10 min', NULL,                       NULL),
  ('00000000-0000-0000-0004-000000000013', 'ORD-1013', '00000000-0000-0000-0000-000000000105', NULL,                                  'Pooja Iyer',     '9988112233', '1',  'DINE_IN',  'COMPLETED', 'CASH',   'CASH',    NULL,               130.00,  6.50, 136.50, NULL,            NOW() - INTERVAL '40 min', NOW() - INTERVAL '38 min', NOW() - INTERVAL '30 min'),
  ('00000000-0000-0000-0004-000000000014', 'ORD-1014', '00000000-0000-0000-0000-000000000105', NULL,                                  'Aditya Rao',     '9900998877', '3',  'DINE_IN',  'PREPARING', 'ONLINE', 'PAID',    'pay_Klm890nop010', 95.00,   4.75,  99.75, NULL,            NOW() - INTERVAL '8 min',  NOW() - INTERVAL '5 min',  NULL);

INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price) VALUES
  -- Order 9 (Biryani House)
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000009', '00000000-0000-0000-0002-000000000042', 'Mutton Biryani',                1, 380.00, 380.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000009', '00000000-0000-0000-0002-000000000045', 'Chicken 65',                    1, 260.00, 260.00),
  -- Order 10 (Biryani House)
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000010', '00000000-0000-0000-0002-000000000043', 'Veg Biryani',                   1, 240.00, 240.00),
  -- Order 11 (Cake Studio)
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000011', '00000000-0000-0000-0002-000000000051', 'Chocolate Truffle Cake (1kg)',  1, 850.00, 850.00),
  -- Order 12 (Cake Studio)
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000012', '00000000-0000-0000-0002-000000000054', 'Blueberry Cheesecake (slice)',  1, 180.00, 180.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000012', '00000000-0000-0000-0002-000000000056', 'Chocolate Brownie',             1, 120.00, 120.00),
  -- Order 13 (Chai & Chaat)
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000013', '00000000-0000-0000-0002-000000000061', 'Pani Puri (6 pcs)',             1,  60.00,  60.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000013', '00000000-0000-0000-0002-000000000064', 'Masala Chai',                   2,  25.00,  50.00),
  -- Order 14 (Chai & Chaat)
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000014', '00000000-0000-0000-0002-000000000067', 'Vada Pav',                      1,  35.00,  35.00),
  (gen_random_uuid(), '00000000-0000-0000-0004-000000000014', '00000000-0000-0000-0002-000000000064', 'Masala Chai',                   2,  25.00,  50.00);


-- ============================================================
--  SECTION 6 — aviqr_payment
-- ============================================================
\connect aviqr_payment

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── payments ──────────────────────────────────────────────────
CREATE TABLE payments (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id        VARCHAR(100)  NOT NULL UNIQUE,
    order_id          VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    shop_id           VARCHAR(100)  NOT NULL,
    customer_id       VARCHAR(100),
    amount            DECIMAL(10,2) NOT NULL,
    currency          VARCHAR(10)   DEFAULT 'INR',
    status            VARCHAR(20)   DEFAULT 'PENDING',
    gateway           VARCHAR(20),
    gateway_response  TEXT,
    failure_reason    TEXT,
    created_at        TIMESTAMP     DEFAULT NOW(),
    paid_at           TIMESTAMP,
    refunded_at       TIMESTAMP
);

CREATE INDEX idx_payments_shop_id  ON payments (shop_id);
CREATE INDEX idx_payments_order_id ON payments (order_id);
CREATE INDEX idx_payments_status   ON payments (status);
CREATE INDEX idx_payments_customer ON payments (customer_id);
CREATE INDEX idx_payments_paid_at  ON payments (paid_at DESC);

CREATE SEQUENCE seq_payment_ref START 1001 INCREMENT 1;

-- ── Dummy data — payments ─────────────────────────────────────
INSERT INTO payments (id, payment_id, order_id, razorpay_order_id, shop_id, customer_id, amount, currency, status, gateway, created_at, paid_at) VALUES
  (gen_random_uuid(), 'pay_Abc123xyz001', 'ORD-1001', 'order_RpAbc001', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 719.25, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '115 min'),
  (gen_random_uuid(), 'pay_Def456ghi002', 'ORD-1003', 'order_RpDef002', '00000000-0000-0000-0000-000000000101', NULL,                                   630.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '22 min',   NOW() - INTERVAL '20 min'),
  (gen_random_uuid(), 'pay_Ghi789jkl003', 'ORD-1004', 'order_RpGhi003', '00000000-0000-0000-0000-000000000101', NULL,                                   462.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '6 min',    NOW() - INTERVAL '5 min'),
  (gen_random_uuid(), 'pay_Jkl012mno004', 'ORD-1005', 'order_RpJkl004', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 336.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '36 min',   NOW() - INTERVAL '34 min'),
  (gen_random_uuid(), 'pay_Mno345pqr005', 'ORD-1006', 'order_RpMno005', '00000000-0000-0000-0000-000000000101', NULL,                                   399.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '235 min'),
  (gen_random_uuid(), 'pay_Pqr678stu006', 'ORD-1007', 'order_RpPqr006', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 525.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '1 day',    NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'pay_FAIL_001',     'ORD-FAIL1', 'order_RpFail01', '00000000-0000-0000-0000-000000000101', NULL,                                   280.00, 'INR', 'FAILED',   'RAZORPAY', NOW() - INTERVAL '6 hours',  NULL),
  (gen_random_uuid(), 'pay_Stu901vwx007', 'ORD-1009', 'order_RpStu007', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000011', 735.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'pay_Yza234bcd008', 'ORD-1011', 'order_RpYza008', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010', 892.50, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '1 day',   NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'pay_Efg567hij009', 'ORD-1012', 'order_RpEfg009', '00000000-0000-0000-0000-000000000104', NULL,                                   315.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '11 min',  NOW() - INTERVAL '10 min'),
  (gen_random_uuid(), 'pay_Klm890nop010', 'ORD-1014', 'order_RpKlm010', '00000000-0000-0000-0000-000000000105', NULL,                                    99.75, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '9 min',   NOW() - INTERVAL '8 min');


-- ============================================================
--  SECTION 7 — aviqr_qr
-- ============================================================
\connect aviqr_qr

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── qr_codes ──────────────────────────────────────────────────
CREATE TABLE qr_codes (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code     VARCHAR(100) NOT NULL UNIQUE,
    target_url  VARCHAR(2000) NOT NULL,
    shop_id     VARCHAR(100) NOT NULL,
    label       VARCHAR(255),
    type        VARCHAR(30)  DEFAULT 'SHOP',
    group_param VARCHAR(100),
    scan_count  BIGINT       DEFAULT 0,
    active      BOOLEAN      DEFAULT TRUE,
    created_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_qr_shop_id    ON qr_codes (shop_id);
CREATE INDEX idx_qr_type       ON qr_codes (type);
CREATE INDEX idx_qr_active     ON qr_codes (active);
CREATE INDEX idx_qr_scan_count ON qr_codes (scan_count DESC);

-- ── qr_scan_logs ──────────────────────────────────────────────
CREATE TABLE qr_scan_logs (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code    VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    scanned_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_qr_scan_logs_code       ON qr_scan_logs (qr_code);
CREATE INDEX idx_qr_scan_logs_scanned_at ON qr_scan_logs (scanned_at DESC);

-- Sequence for scan stats
CREATE SEQUENCE seq_qr_scan_batch START 1 INCREMENT 10;

-- ── Dummy data — qr_codes ─────────────────────────────────────
INSERT INTO qr_codes (id, qr_code, target_url, shop_id, label, type, group_param, scan_count, active) VALUES
  ('00000000-0000-0000-0005-000000000001', 'spiceroute',     'https://aviqr.in/menu/00000000-0000-0000-0000-000000000101',           '00000000-0000-0000-0000-000000000101', 'Main Shop QR',   'SHOP',  NULL,  2841, TRUE),
  ('00000000-0000-0000-0005-000000000002', 'spiceroute-t1',  'https://aviqr.in/menu/00000000-0000-0000-0000-000000000101?table=1',   '00000000-0000-0000-0000-000000000101', 'Table 1',        'TABLE', '1',    284, TRUE),
  ('00000000-0000-0000-0005-000000000003', 'spiceroute-t2',  'https://aviqr.in/menu/00000000-0000-0000-0000-000000000101?table=2',   '00000000-0000-0000-0000-000000000101', 'Table 2',        'TABLE', '2',    312, TRUE),
  ('00000000-0000-0000-0005-000000000004', 'spiceroute-t3',  'https://aviqr.in/menu/00000000-0000-0000-0000-000000000101?table=3',   '00000000-0000-0000-0000-000000000101', 'Table 3',        'TABLE', '3',    198, TRUE),
  ('00000000-0000-0000-0005-000000000005', 'spiceroute-t4',  'https://aviqr.in/menu/00000000-0000-0000-0000-000000000101?table=4',   '00000000-0000-0000-0000-000000000101', 'Table 4',        'TABLE', '4',    421, TRUE),
  ('00000000-0000-0000-0005-000000000006', 'coconutgrove',   'https://aviqr.in/menu/00000000-0000-0000-0000-000000000102',           '00000000-0000-0000-0000-000000000102', 'Main Shop QR',   'SHOP',  NULL,  1547, TRUE),
  ('00000000-0000-0000-0005-000000000007', 'biryanihouse',   'https://aviqr.in/menu/00000000-0000-0000-0000-000000000103',           '00000000-0000-0000-0000-000000000103', 'Main Shop QR',   'SHOP',  NULL,   987, FALSE),
  ('00000000-0000-0000-0005-000000000008', 'cakestudio-del', 'https://aviqr.in/menu/00000000-0000-0000-0000-000000000104',           '00000000-0000-0000-0000-000000000104', 'Main Shop QR',   'SHOP',  NULL,   234, TRUE),
  ('00000000-0000-0000-0005-000000000009', 'chaichaat-pune', 'https://aviqr.in/menu/00000000-0000-0000-0000-000000000105',           '00000000-0000-0000-0000-000000000105', 'Main Shop QR',   'SHOP',  NULL,   156, TRUE);

INSERT INTO qr_scan_logs (id, qr_code, ip_address, user_agent, scanned_at) VALUES
  (gen_random_uuid(), 'spiceroute',    '103.21.58.12',  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',     NOW() - INTERVAL '5 min'),
  (gen_random_uuid(), 'spiceroute-t4', '103.21.58.13',  'Mozilla/5.0 (Android 13; Mobile)',             NOW() - INTERVAL '12 min'),
  (gen_random_uuid(), 'spiceroute-t2', '49.207.192.100','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6)',     NOW() - INTERVAL '22 min'),
  (gen_random_uuid(), 'coconutgrove',  '117.197.52.44', 'Mozilla/5.0 (Android 12; Mobile)',             NOW() - INTERVAL '45 min'),
  (gen_random_uuid(), 'spiceroute',    '115.114.88.33', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1)',     NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'chaichaat-pune','103.45.67.89',  'Mozilla/5.0 (Android 14; Mobile)',             NOW() - INTERVAL '8 min');


-- ============================================================
--  SECTION 8 — aviqr_hotel
-- ============================================================
\connect aviqr_hotel

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── hotels ────────────────────────────────────────────────────
CREATE TABLE hotels (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    owner_id          VARCHAR(100),
    phone             VARCHAR(20),
    email             VARCHAR(255),
    address           TEXT,
    city              VARCHAR(100),
    logo_url          VARCHAR(1000),
    total_rooms       INTEGER,
    check_in_time     VARCHAR(10),
    check_out_time    VARCHAR(10),
    subscription_plan VARCHAR(50),
    active            BOOLEAN      DEFAULT TRUE,
    created_at        TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_hotels_owner_id ON hotels (owner_id);
CREATE INDEX idx_hotels_city     ON hotels (city);
CREATE INDEX idx_hotels_active   ON hotels (active);

-- ── hotel_enabled_services ────────────────────────────────────
CREATE TABLE hotel_enabled_services (
    hotel_id         UUID,
    enabled_services VARCHAR(50)
);

CREATE INDEX idx_hotel_enabled_services ON hotel_enabled_services (hotel_id);

-- ── rooms ─────────────────────────────────────────────────────
CREATE TABLE rooms (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id       UUID         NOT NULL,
    room_number    VARCHAR(20)  NOT NULL,
    room_type      VARCHAR(50),
    floor          VARCHAR(50),
    status         VARCHAR(20)  DEFAULT 'VACANT',
    guest_name     VARCHAR(255),
    check_in_date  VARCHAR(30),
    check_out_date VARCHAR(30),
    qr_active      BOOLEAN      DEFAULT TRUE
);

CREATE INDEX idx_rooms_hotel_id ON rooms (hotel_id);
CREATE INDEX idx_rooms_status   ON rooms (status);

-- ── room_requests ─────────────────────────────────────────────
CREATE TABLE room_requests (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id     UUID         NOT NULL,
    room_number  VARCHAR(20)  NOT NULL,
    service_type VARCHAR(50)  NOT NULL,
    description  TEXT         NOT NULL,
    status       VARCHAR(20)  DEFAULT 'NEW',
    priority     VARCHAR(20)  DEFAULT 'NORMAL',
    notes        TEXT,
    assigned_to  VARCHAR(100),
    created_at   TIMESTAMP    DEFAULT NOW(),
    resolved_at  TIMESTAMP
);

CREATE INDEX idx_requests_hotel_id   ON room_requests (hotel_id);
CREATE INDEX idx_requests_status     ON room_requests (status);
CREATE INDEX idx_requests_service    ON room_requests (service_type);
CREATE INDEX idx_requests_created_at ON room_requests (created_at DESC);

CREATE SEQUENCE seq_hotel_request_ref START 1001 INCREMENT 1;

-- ── Dummy data — hotels ───────────────────────────────────────
INSERT INTO hotels (id, name, owner_id, phone, email, address, city, total_rooms, check_in_time, check_out_time, subscription_plan, active) VALUES
  ('00000000-0000-0000-0006-000000000001', 'Grand Palace Hotel', '00000000-0000-0000-0000-000000000006', '08011223344', 'gm@grandpalace.in', '45, Anna Salai, Teynampet', 'Chennai',   120, '14:00', '12:00', 'HOTEL_PRO',     TRUE),
  ('00000000-0000-0000-0006-000000000002', 'The Leela Resort',   '00000000-0000-0000-0000-000000000006', '08322445566', 'gm@leela.in',       'Calangute Beach Road',      'Goa',       280, '15:00', '11:00', 'RESORT_SUITE',  TRUE),
  ('00000000-0000-0000-0006-000000000003', 'Budget Inn Jaipur',  '00000000-0000-0000-0000-000000000006', '01412223344', 'gm@budgetinn.in',   '12, MI Road',               'Jaipur',     40, '12:00', '10:00', 'HOTEL_BASIC',   TRUE);

INSERT INTO hotel_enabled_services (hotel_id, enabled_services) VALUES
  ('00000000-0000-0000-0006-000000000001', 'ROOM_SERVICE'),
  ('00000000-0000-0000-0006-000000000001', 'LAUNDRY'),
  ('00000000-0000-0000-0006-000000000001', 'SPA'),
  ('00000000-0000-0000-0006-000000000001', 'HOUSEKEEPING'),
  ('00000000-0000-0000-0006-000000000001', 'MAINTENANCE'),
  ('00000000-0000-0000-0006-000000000002', 'ROOM_SERVICE'),
  ('00000000-0000-0000-0006-000000000002', 'LAUNDRY'),
  ('00000000-0000-0000-0006-000000000002', 'SPA'),
  ('00000000-0000-0000-0006-000000000002', 'HOUSEKEEPING'),
  ('00000000-0000-0000-0006-000000000002', 'MAINTENANCE'),
  ('00000000-0000-0000-0006-000000000002', 'TRANSPORT'),
  ('00000000-0000-0000-0006-000000000003', 'ROOM_SERVICE'),
  ('00000000-0000-0000-0006-000000000003', 'HOUSEKEEPING');

INSERT INTO rooms (id, hotel_id, room_number, room_type, floor, status, guest_name, check_in_date, check_out_date, qr_active) VALUES
  ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0006-000000000001', '101', 'Standard',      '1st Floor', 'OCCUPIED',     'Anjali Singh',    'Jun 15, 2026', 'Jun 17, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0006-000000000001', '102', 'Standard',      '1st Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0006-000000000001', '103', 'Standard',      '1st Floor', 'MAINTENANCE',  NULL,              NULL,           NULL,           FALSE),
  ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0006-000000000001', '201', 'Deluxe',        '2nd Floor', 'OCCUPIED',     'Ravi Kumar',      'Jun 13, 2026', 'Jun 18, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000005', '00000000-0000-0000-0006-000000000001', '202', 'Deluxe',        '2nd Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000006', '00000000-0000-0000-0006-000000000001', '301', 'Suite',         '3rd Floor', 'OCCUPIED',     'Meena Pillai',    'Jun 14, 2026', 'Jun 20, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000007', '00000000-0000-0000-0006-000000000001', '302', 'Suite',         '3rd Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000008', '00000000-0000-0000-0006-000000000001', '401', 'Presidential',  '4th Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE);

-- The Leela Resort
INSERT INTO rooms (id, hotel_id, room_number, room_type, floor, status, guest_name, check_in_date, check_out_date, qr_active) VALUES
  ('00000000-0000-0000-0007-000000000009', '00000000-0000-0000-0006-000000000002', '101', 'Sea View Deluxe', '1st Floor', 'OCCUPIED', 'Farhan Khan',     'Jun 16, 2026', 'Jun 19, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000010', '00000000-0000-0000-0006-000000000002', '102', 'Sea View Deluxe', '1st Floor', 'VACANT',   NULL,              NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000011', '00000000-0000-0000-0006-000000000002', '201', 'Garden Villa',     '2nd Floor', 'OCCUPIED', 'Priya Menon',     'Jun 14, 2026', 'Jun 21, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000012', '00000000-0000-0000-0006-000000000002', '202', 'Garden Villa',     '2nd Floor', 'VACANT',   NULL,              NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000013', '00000000-0000-0000-0006-000000000002', '301', 'Pool Suite',       '3rd Floor', 'MAINTENANCE', NULL,           NULL,           NULL,           FALSE),
  ('00000000-0000-0000-0007-000000000014', '00000000-0000-0000-0006-000000000002', '302', 'Pool Suite',       '3rd Floor', 'VACANT',   NULL,              NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000015', '00000000-0000-0000-0006-000000000002', '401', 'Presidential Villa','4th Floor','OCCUPIED', 'Vikram Sharma',  'Jun 17, 2026', 'Jun 20, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000016', '00000000-0000-0000-0006-000000000002', '402', 'Presidential Villa','4th Floor','VACANT',   NULL,              NULL,           NULL,           TRUE);

-- Budget Inn Jaipur
INSERT INTO rooms (id, hotel_id, room_number, room_type, floor, status, guest_name, check_in_date, check_out_date, qr_active) VALUES
  ('00000000-0000-0000-0007-000000000017', '00000000-0000-0000-0006-000000000003', '1', 'Standard', 'Ground Floor', 'OCCUPIED', 'Ravi Kumar', 'Jun 18, 2026', 'Jun 19, 2026', TRUE),
  ('00000000-0000-0000-0007-000000000018', '00000000-0000-0000-0006-000000000003', '2', 'Standard', 'Ground Floor', 'VACANT',   NULL,         NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000019', '00000000-0000-0000-0006-000000000003', '3', 'Standard', '1st Floor',    'VACANT',   NULL,         NULL,           NULL,           TRUE),
  ('00000000-0000-0000-0007-000000000020', '00000000-0000-0000-0006-000000000003', '4', 'Deluxe',   '1st Floor',    'MAINTENANCE', NULL,      NULL,           NULL,           FALSE);

INSERT INTO room_requests (id, hotel_id, room_number, service_type, description, status, priority, created_at, resolved_at) VALUES
  ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0006-000000000001', '101', 'ROOM_SERVICE', 'Club Sandwich + Fresh Lime Soda',                    'NEW',       'HIGH',   NOW() - INTERVAL '5 min',    NULL),
  ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0006-000000000001', '201', 'LAUNDRY',      '2 shirts, 1 trouser (express)',                      'PREPARING', 'NORMAL', NOW() - INTERVAL '12 min',   NULL),
  ('00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0006-000000000001', '301', 'MAINTENANCE',  'AC not cooling — temperature stuck at 28 degrees',  'PREPARING', 'HIGH',   NOW() - INTERVAL '20 min',   NULL),
  ('00000000-0000-0000-0008-000000000004', '00000000-0000-0000-0006-000000000001', '101', 'SPA',          '60-min Swedish Massage at 3 PM for 2 guests',       'CONFIRMED', 'NORMAL', NOW() - INTERVAL '35 min',   NULL),
  ('00000000-0000-0000-0008-000000000005', '00000000-0000-0000-0006-000000000001', '201', 'ROOM_SERVICE', 'Breakfast for 2 — continental set',                  'DONE',      'NORMAL', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '90 min'),
  ('00000000-0000-0000-0008-000000000006', '00000000-0000-0000-0006-000000000001', '301', 'HOUSEKEEPING', 'Extra towels (2) and bed pillows (4)',               'DONE',      'NORMAL', NOW() - INTERVAL '1 hour',   NOW() - INTERVAL '45 min'),
  ('00000000-0000-0000-0008-000000000007', '00000000-0000-0000-0006-000000000002', '101', 'ROOM_SERVICE', 'Seafood platter for 2 with chilled white wine',      'NEW',       'HIGH',   NOW() - INTERVAL '8 min',    NULL),
  ('00000000-0000-0000-0008-000000000008', '00000000-0000-0000-0006-000000000002', '201', 'SPA',          '90-min couple massage at the beach cabana',          'CONFIRMED', 'NORMAL', NOW() - INTERVAL '25 min',   NULL),
  ('00000000-0000-0000-0008-000000000009', '00000000-0000-0000-0006-000000000002', '401', 'TRANSPORT',    'Airport pickup at 6 AM tomorrow, 2 guests',          'NEW',       'HIGH',   NOW() - INTERVAL '15 min',   NULL),
  ('00000000-0000-0000-0008-000000000010', '00000000-0000-0000-0006-000000000002', '301', 'MAINTENANCE',  'Pool suite jacuzzi not heating',                     'PREPARING', 'NORMAL', NOW() - INTERVAL '1 hour',   NULL),
  ('00000000-0000-0000-0008-000000000011', '00000000-0000-0000-0006-000000000003', '1',   'ROOM_SERVICE', '2 bottles of water and extra blanket',               'DONE',      'NORMAL', NOW() - INTERVAL '3 hours',  NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0008-000000000012', '00000000-0000-0000-0006-000000000003', '4',   'MAINTENANCE',  'Geyser not working, no hot water',                   'NEW',       'HIGH',   NOW() - INTERVAL '40 min',   NULL);


-- ============================================================
--  SECTION 9 — aviqr_mall
-- ============================================================
\connect aviqr_mall

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── malls ─────────────────────────────────────────────────────
CREATE TABLE malls (
    id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    name               VARCHAR(255)  NOT NULL,
    admin_id           VARCHAR(100),
    city               VARCHAR(100),
    address            TEXT,
    phone              VARCHAR(20),
    email              VARCHAR(255),
    logo_url           VARCHAR(1000),
    commission_percent DECIMAL(5,2)  DEFAULT 10,
    subscription_plan  VARCHAR(50),
    active             BOOLEAN       DEFAULT TRUE,
    created_at         TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_malls_admin_id ON malls (admin_id);
CREATE INDEX idx_malls_city     ON malls (city);
CREATE INDEX idx_malls_active   ON malls (active);

-- ── vendors ───────────────────────────────────────────────────
CREATE TABLE vendors (
    id        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    mall_id   UUID         NOT NULL,
    name      VARCHAR(255) NOT NULL,
    category  VARCHAR(100),
    floor     VARCHAR(50),
    contact   VARCHAR(20),
    shop_id   VARCHAR(100),
    active    BOOLEAN      DEFAULT TRUE,
    qr_active BOOLEAN      DEFAULT TRUE
);

CREATE INDEX idx_vendors_mall_id ON vendors (mall_id);
CREATE INDEX idx_vendors_active  ON vendors (active);
CREATE INDEX idx_vendors_floor   ON vendors (floor);

CREATE SEQUENCE seq_vendor_ref START 1001 INCREMENT 1;

-- ── Dummy data ────────────────────────────────────────────────
INSERT INTO malls (id, name, admin_id, city, address, phone, email, commission_percent, subscription_plan, active) VALUES
  ('00000000-0000-0000-0009-000000000001', 'Forum Mall Bengaluru',  '00000000-0000-0000-0000-000000000007', 'Bengaluru', 'Hosur Road, Koramangala', '08041234567', 'admin@forummall.in',   10.00, 'MALL_PRO',     TRUE),
  ('00000000-0000-0000-0009-000000000002', 'Phoenix Market City',   '00000000-0000-0000-0000-000000000007', 'Mumbai',    'LBS Marg, Kurla',         '02261234567', 'admin@phoenixmc.in',  10.00, 'ENTERPRISE',   TRUE),
  ('00000000-0000-0000-0009-000000000003', 'Elante Mall',           '00000000-0000-0000-0000-000000000007', 'Chandigarh','Industrial Area Phase I',  '01726543210', 'admin@elante.in',     12.00, 'MALL_BASIC',   TRUE);

INSERT INTO vendors (id, mall_id, name, category, floor, contact, shop_id, active, qr_active) VALUES
  ('00000000-0000-0000-000A-000000000001', '00000000-0000-0000-0009-000000000001', 'Spice Route',       'North Indian',  'F1', '9845012345', '00000000-0000-0000-0000-000000000101', TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000002', '00000000-0000-0000-0009-000000000001', 'Wok to Walk',       'Chinese',       'F1', '9876501234', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000003', '00000000-0000-0000-0009-000000000001', 'Burger Republic',   'Fast Food',     'F2', '9112345678', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000004', '00000000-0000-0000-0009-000000000001', 'Rolls Corner',      'Kathi Rolls',   'F1', '9988000001', NULL,                                   FALSE, FALSE),
  ('00000000-0000-0000-000A-000000000005', '00000000-0000-0000-0009-000000000001', 'Ice Cream Palace',  'Desserts',      'F2', '9000112233', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000006', '00000000-0000-0000-0009-000000000001', 'South Spice',       'South Indian',  'F2', '9876509876', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000007', '00000000-0000-0000-0009-000000000002', 'Biryani Blues',     'Biryani',       'GF', '9900112244', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000008', '00000000-0000-0000-0009-000000000002', 'Pizza Express',     'Italian',       'FF', '9900223355', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-000000000009', '00000000-0000-0000-0009-000000000002', 'Chaat Central',     'Street Food',   'GF', '9900334466', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-00000000000A', '00000000-0000-0000-0009-000000000003', 'Chai & Chaat',      'Street Food',   'GF', '9845099999', '00000000-0000-0000-0000-000000000105', TRUE,  TRUE),
  ('00000000-0000-0000-000A-00000000000B', '00000000-0000-0000-0009-000000000003', 'Naturals Ice Cream','Desserts',      'F1', '9988334455', NULL,                                   TRUE,  TRUE),
  ('00000000-0000-0000-000A-00000000000C', '00000000-0000-0000-0009-000000000003', 'Subway',            'Fast Food',     'F1', '9988556677', NULL,                                   TRUE,  TRUE);


-- ============================================================
--  SECTION 10 — aviqr_support
-- ============================================================
\connect aviqr_support

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── support_tickets ───────────────────────────────────────────
CREATE TABLE support_tickets (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(30)  NOT NULL UNIQUE,
    user_id       VARCHAR(100),
    user_name     VARCHAR(255),
    user_role     VARCHAR(30),
    subject       VARCHAR(500) NOT NULL,
    description   TEXT,
    priority      VARCHAR(20)  DEFAULT 'MEDIUM',
    status        VARCHAR(20)  DEFAULT 'OPEN',
    assigned_to   VARCHAR(100),
    resolution    TEXT,
    created_at    TIMESTAMP    DEFAULT NOW(),
    updated_at    TIMESTAMP    DEFAULT NOW(),
    resolved_at   TIMESTAMP
);

CREATE INDEX idx_tickets_status     ON support_tickets (status);
CREATE INDEX idx_tickets_user_id    ON support_tickets (user_id);
CREATE INDEX idx_tickets_priority   ON support_tickets (priority);
CREATE INDEX idx_tickets_created_at ON support_tickets (created_at DESC);
CREATE INDEX idx_tickets_assigned   ON support_tickets (assigned_to);

-- ── impersonation_logs ────────────────────────────────────────
CREATE TABLE impersonation_logs (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id         VARCHAR(100)  NOT NULL,
    agent_name       VARCHAR(255),
    target_user_id   VARCHAR(100)  NOT NULL,
    target_user_name VARCHAR(255),
    reason           VARCHAR(1000),
    created_at       TIMESTAMP     DEFAULT NOW(),
    ended_at         TIMESTAMP
);

CREATE INDEX idx_impersonation_agent     ON impersonation_logs (agent_id);
CREATE INDEX idx_impersonation_target    ON impersonation_logs (target_user_id);
CREATE INDEX idx_impersonation_created   ON impersonation_logs (created_at DESC);

CREATE SEQUENCE seq_ticket_number START 10001 INCREMENT 1;

-- ── Dummy data — support_tickets ─────────────────────────────
INSERT INTO support_tickets (id, ticket_number, user_id, user_name, user_role, subject, description, priority, status, assigned_to, created_at, updated_at, resolved_at) VALUES
  ('00000000-0000-0000-000B-000000000001', 'TKT-10001', '00000000-0000-0000-0000-000000000003', 'Sujeet Narayanan', 'OWNER',    'QR code not scanning on Android phones',                 'Customers with older Android devices report the QR redirects to a blank page.',         'HIGH',   'OPEN',     '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 hours',   NOW() - INTERVAL '1 hour',    NULL),
  ('00000000-0000-0000-000B-000000000002', 'TKT-10002', '00000000-0000-0000-0000-000000000004', 'Meena Pillai',    'OWNER',    'Payment stuck in PENDING for 2 hours',                   'Order ORD-1003 payment shows pending but amount was deducted from customer account.',   'URGENT', 'PENDING',  '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '3 hours',   NOW() - INTERVAL '30 min',    NULL),
  ('00000000-0000-0000-000B-000000000003', 'TKT-10003', '00000000-0000-0000-0000-000000000006', 'Grand Palace Hotel','HOTEL',  'Room service menu not loading for hotel guests',         'Guests scanning room QR code see an empty menu page. Items added but not reflecting.',  'HIGH',   'OPEN',     NULL,                                   NOW() - INTERVAL '5 hours',   NOW() - INTERVAL '5 hours',   NULL),
  ('00000000-0000-0000-000B-000000000004', 'TKT-10004', '00000000-0000-0000-0000-000000000003', 'Sujeet Narayanan', 'OWNER',   'How to bulk upload menu via Excel?',                     'Looking for documentation on uploading menu items in bulk without scanning each one.',  'LOW',    'RESOLVED', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day',     NOW() - INTERVAL '20 hours',  NOW() - INTERVAL '20 hours'),
  ('00000000-0000-0000-000B-000000000005', 'TKT-10005', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',    'CUSTOMER', 'Order placed but restaurant says they did not receive it','I placed order ORD-1001 at Spice Route, paid online, but the restaurant had no record.','HIGH',   'RESOLVED', '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days',    NOW() - INTERVAL '1 day',     NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-000B-000000000006', 'TKT-10006', '00000000-0000-0000-0000-000000000007', 'Forum Mall Admin', 'MALL',   'Commission report shows wrong percentage',               'Monthly commission report shows 12% instead of the agreed 10% rate.',                   'MEDIUM', 'OPEN',     NULL,                                   NOW() - INTERVAL '6 hours',   NOW() - INTERVAL '6 hours',   NULL),
  ('00000000-0000-0000-000B-000000000007', 'TKT-10007', '00000000-0000-0000-0000-000000000005', 'Farhan Khan',     'OWNER',   'Account suspended without notice',                       'My account was suspended. I have not violated any terms. Please review and reinstate.',  'URGENT', 'PENDING',  '00000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 hours',   NOW() - INTERVAL '2 hours',   NULL);

INSERT INTO support_tickets (id, ticket_number, user_id, user_name, user_role, subject, description, priority, status, resolution, created_at, updated_at, resolved_at) VALUES
  ('00000000-0000-0000-000B-000000000008', 'TKT-10008', '00000000-0000-0000-0000-000000000003', 'Sujeet Narayanan', 'OWNER', 'OCR menu scan misread item prices',
   'Uploaded a photo of my physical menu. The AI extracted most items correctly but some prices show wrong values.',
   'MEDIUM', 'RESOLVED',
   'Improved OCR confidence threshold. Please re-upload the menu photo and approve the extracted items.',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

INSERT INTO impersonation_logs (id, agent_id, agent_name, target_user_id, target_user_name, reason, created_at, ended_at) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'Arjun Nair', '00000000-0000-0000-0000-000000000003', 'Sujeet Narayanan', 'Investigating TKT-10001 — QR scanning issue on Android', NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '45 min'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'Arjun Nair', '00000000-0000-0000-0000-000000000004', 'Meena Pillai',     'Investigating TKT-10002 — payment stuck PENDING',         NOW() - INTERVAL '30 min', NULL);


-- ============================================================
--  SECTION 11 — aviqr_report (daily report snapshots, paginated)
-- ============================================================
\connect aviqr_report

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── report_snapshots ─────────────────────────────────────────
-- One row per shop per day. report-service paginates/sorts/filters
-- over this table instead of generating random numbers per request.
CREATE TABLE report_snapshots (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id         VARCHAR(100)  NOT NULL,
    report_date     DATE          NOT NULL,
    total_revenue   DECIMAL(12,2) DEFAULT 0,
    total_orders    INTEGER       DEFAULT 0,
    avg_order_value DECIMAL(10,2) DEFAULT 0,
    new_customers   INTEGER       DEFAULT 0,
    top_item        VARCHAR(255),
    peak_hour       VARCHAR(10),
    created_at      TIMESTAMP     DEFAULT NOW(),
    UNIQUE (shop_id, report_date)
);

CREATE INDEX idx_report_snapshots_shop_id ON report_snapshots (shop_id);
CREATE INDEX idx_report_snapshots_date    ON report_snapshots (report_date DESC);

-- ── Dummy data — 30 days of snapshots for each of the 5 demo shops ──
INSERT INTO report_snapshots (shop_id, report_date, total_revenue, total_orders, avg_order_value, new_customers, top_item, peak_hour)
SELECT
  s.shop_id,
  CURRENT_DATE - d AS report_date,
  ROUND((15000 + (d * 137 % 20000))::numeric, 2)        AS total_revenue,
  40 + (d * 7 % 60)                                      AS total_orders,
  ROUND((300 + (d * 11 % 250))::numeric, 2)              AS avg_order_value,
  3 + (d % 15)                                           AS new_customers,
  (ARRAY['Paneer Butter Masala','Butter Chicken','Chicken Biryani','Dal Makhani','Butter Naan'])[1 + (d % 5)] AS top_item,
  (ARRAY['12PM','1PM','7PM','8PM','9PM'])[1 + (d % 5)]   AS peak_hour
FROM generate_series(0, 29) AS d
CROSS JOIN (VALUES
  ('00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000105')
) AS s(shop_id);

-- ============================================================
--  SECTION 12 — aviqr_review (Seller Tier / Product Ranking source)
-- ============================================================
\connect aviqr_review

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── reviews ───────────────────────────────────────────────────
-- Source of truth for shop/product rating + count, which feed both
-- the Seller Tier calculation (shop-service) and Product Ranking
-- (menu-service) nightly jobs.
CREATE TABLE reviews (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       VARCHAR(100)  NOT NULL,
    menu_item_id  UUID,
    order_id      UUID,
    customer_id   VARCHAR(100)  NOT NULL,
    customer_name VARCHAR(255),
    rating        SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_reviews_shop_id      ON reviews (shop_id);
CREATE INDEX idx_reviews_menu_item_id ON reviews (menu_item_id);
CREATE INDEX idx_reviews_customer_id  ON reviews (customer_id);
CREATE INDEX idx_reviews_created_at   ON reviews (created_at DESC);

-- ── Dummy data — reviews for Spice Route + a few of its items ───
INSERT INTO reviews (shop_id, menu_item_id, order_id, customer_id, customer_name, rating, comment, created_at) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0002-000000000006', '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   5, 'Best Paneer Butter Masala in the area!',        NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0002-000000000008', '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000011', 'Ravi Kumar',     5, 'Butter chicken was perfect, will order again.', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000101', NULL,                                   '00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0000-000000000012', 'Sara Thomas',    4, 'Great food, delivery took a bit long.',         NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000102', NULL,                                   '00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   4, 'Loved the Kerala fish curry.',                  NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0002-000000000042', '00000000-0000-0000-0004-000000000009', '00000000-0000-0000-0000-000000000011', 'Ravi Kumar',     3, 'Good mutton biryani but service was slow.',     NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0002-000000000051', '00000000-0000-0000-0004-000000000011', '00000000-0000-0000-0000-000000000010', 'Anjali Singh',   5, 'The truffle cake made my birthday party!',      NOW() - INTERVAL '20 hours'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0002-000000000061', '00000000-0000-0000-0004-000000000013', '00000000-0000-0000-0000-000000000012', 'Sara Thomas',    4, 'Pani puri was fresh and tangy, great value.',   NOW() - INTERVAL '25 min');

-- ============================================================
--  SECTION 13 — BULK DUMMY DATA (100+ customers, 100+ orders)
-- ============================================================
-- Hand-written demo rows above are realistic but few — not enough to
-- exercise pagination, search, or report charts. This section generates
-- a much larger, FK-safe batch on top of them.

-- ── 100 extra customer accounts ───────────────────────────────
\connect aviqr_auth

INSERT INTO users (id, email, phone, password_hash, name, role, status,
                    avatar, email_verified, phone_verified, preferred_language, created_at)
SELECT
  gen_random_uuid(),
  'customer' || g || '@example.com',
  '70000' || lpad(g::text, 5, '0'),
  '$2b$12$Zh1IWWTz.sDOFZ4FS/UOQ.VhC/MJp3Tq8nztJujzZElsBTpUA192u',  -- same Test@1234 hash as above
  (ARRAY['Anita Rao','Vivek Iyer','Sara Thomas','Imran Sheikh','Divya Krishnan',
         'Aakash Gupta','Lavanya Pillai','Rohit Bose','Fatima Sheikh','Nikhil Joshi'])[1 + (g % 10)]
    || ' ' || g,
  'CUSTOMER',
  'ACTIVE',
  'C' || lpad(g::text, 2, '0'),
  TRUE, TRUE, 'en',
  NOW() - ((g % 365) || ' days')::interval
FROM generate_series(1, 100) AS g;

-- ── 100 extra orders (+ matching order_items) for Spice Route ──
\connect aviqr_order

WITH menu_lookup(idx, item_id, item_name, unit_price) AS (
  VALUES
    (0, '00000000-0000-0000-0002-000000000001'::uuid, 'Paneer Tikka',          280.00),
    (1, '00000000-0000-0000-0002-000000000006'::uuid, 'Paneer Butter Masala',  320.00),
    (2, '00000000-0000-0000-0002-000000000008'::uuid, 'Butter Chicken',        380.00),
    (3, '00000000-0000-0000-0002-000000000012'::uuid, 'Butter Naan',            55.00),
    (4, '00000000-0000-0000-0002-000000000017'::uuid, 'Chicken Biryani',       360.00),
    (5, '00000000-0000-0000-0002-000000000021'::uuid, 'Masala Chai',            40.00),
    (6, '00000000-0000-0000-0002-000000000007'::uuid, 'Dal Makhani',           280.00),
    (7, '00000000-0000-0000-0002-000000000019'::uuid, 'Gulab Jamun (2 pcs)',    90.00)
),
new_orders AS (
  INSERT INTO orders (id, order_number, shop_id, customer_id, customer_name, customer_phone,
                       table_number, type, status, payment_method, payment_status, payment_id,
                       subtotal, tax, total_amount, created_at, accepted_at, completed_at)
  SELECT
    gen_random_uuid(),
    'ORD-BULK-' || g,
    '00000000-0000-0000-0000-000000000101',                       -- Spice Route
    NULL,
    (ARRAY['Anita Rao','Vivek Iyer','Sara Thomas','Imran Sheikh','Divya Krishnan',
           'Aakash Gupta','Lavanya Pillai','Rohit Bose','Fatima Sheikh','Nikhil Joshi'])[1 + (g % 10)],
    '70000' || lpad(g::text, 5, '0'),
    ((g % 12) + 1)::text,
    CASE WHEN g % 5 = 0 THEN 'TAKEAWAY' ELSE 'DINE_IN' END,
    (ARRAY['COMPLETED','COMPLETED','COMPLETED','READY','PREPARING','NEW'])[1 + (g % 6)],
    CASE WHEN g % 3 = 0 THEN 'CASH' ELSE 'ONLINE' END,
    CASE WHEN g % 3 = 0 THEN 'CASH' ELSE 'PAID' END,
    CASE WHEN g % 3 = 0 THEN NULL ELSE 'pay_bulk' || g END,
    (200 + (g % 15) * 35)::decimal(10,2),
    ROUND((200 + (g % 15) * 35) * 0.05, 2),
    ROUND((200 + (g % 15) * 35) * 1.05, 2),
    NOW() - ((g % 30) || ' days')::interval - ((g % 24) || ' hours')::interval,
    NOW() - ((g % 30) || ' days')::interval - ((g % 24) || ' hours')::interval + INTERVAL '10 minutes',
    CASE WHEN g % 6 < 3
      THEN NOW() - ((g % 30) || ' days')::interval - ((g % 24) || ' hours')::interval + INTERVAL '30 minutes'
      ELSE NULL
    END
  FROM generate_series(1, 100) AS g
  RETURNING id, order_number
),
numbered AS (
  SELECT id, split_part(order_number, '-', 3)::int AS g FROM new_orders
)
INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price)
SELECT
  gen_random_uuid(),
  n.id,
  m.item_id,
  m.item_name,
  1 + (n.g % 3),
  m.unit_price,
  m.unit_price * (1 + (n.g % 3))
FROM numbered n
JOIN menu_lookup m ON m.idx = (n.g % 8);
-- amounts are approximate (dummy data) — not reconciled to the cent like the
-- hand-written orders above; fine for pagination/report/demo purposes.


-- ============================================================
--  SECTION 14 — FINAL GRANTS
-- ============================================================
\connect aviqr_auth
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_shop
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_menu
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_order
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_payment
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_qr
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_hotel
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_mall
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_support
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_report
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect aviqr_review
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;


-- ============================================================
--  SECTION 15 — QUICK VERIFICATION QUERIES
-- ============================================================
-- Run these after setup to verify row counts:
--
-- \connect aviqr_auth aviqr
-- SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;
--
-- \connect aviqr_shop aviqr
-- SELECT name, subscription_plan, status FROM shops;
--
-- \connect aviqr_menu aviqr
-- SELECT COUNT(*) AS items, shop_id FROM menu_items GROUP BY shop_id;
--
-- \connect aviqr_order aviqr
-- SELECT status, COUNT(*) FROM orders GROUP BY status;
--
-- \connect aviqr_payment aviqr
-- SELECT status, COUNT(*), SUM(amount) FROM payments GROUP BY status;
--
-- \connect aviqr_qr aviqr
-- SELECT qr_code, label, scan_count FROM qr_codes ORDER BY scan_count DESC;
--
-- \connect aviqr_hotel aviqr
-- SELECT status, COUNT(*) FROM rooms GROUP BY status;
--
-- \connect aviqr_mall aviqr
-- SELECT m.name, COUNT(v.id) AS vendors FROM malls m LEFT JOIN vendors v ON v.mall_id=m.id GROUP BY m.name;
--
-- \connect aviqr_support aviqr
-- SELECT status, priority, COUNT(*) FROM support_tickets GROUP BY status, priority ORDER BY status;
--
-- \connect aviqr_report aviqr
-- SELECT shop_id, COUNT(*) AS days, SUM(total_revenue) FROM report_snapshots GROUP BY shop_id;
--
-- \connect aviqr_review aviqr
-- SELECT shop_id, ROUND(AVG(rating),2) AS avg_rating, COUNT(*) FROM reviews GROUP BY shop_id;
--
-- \connect aviqr_shop aviqr
-- SELECT name, tier, rating, completion_rate FROM shops ORDER BY tier;
--
-- \connect aviqr_menu aviqr
-- SELECT name, ranking_score, rating, slug FROM menu_items ORDER BY ranking_score DESC LIMIT 10;
