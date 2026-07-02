-- ============================================================
--  AviQR OS — Complete Database Setup
--  PostgreSQL 17+
--  Run as superuser: sudo -u postgres psql -f aviqr_setup.sql
--
--  Databases created: aviqr_auth, aviqr_shop, aviqr_menu, aviqr_order,
--                      aviqr_payment, aviqr_qr, aviqr_hotel, aviqr_mall,
--                      aviqr_support, aviqr_report, aviqr_review  (11 total)
--
--  Includes hand-written demo records (Spice Route, Coconut Grove, etc.)
--  plus a bulk-generated block of 100+ customers and 100+ orders
--  (with matching order_items) — see SECTION 13.
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

-- Drop existing databases for a clean re-run
DROP DATABASE IF EXISTS aviqr_auth;
DROP DATABASE IF EXISTS aviqr_shop;
DROP DATABASE IF EXISTS aviqr_menu;
DROP DATABASE IF EXISTS aviqr_order;
DROP DATABASE IF EXISTS aviqr_payment;
DROP DATABASE IF EXISTS aviqr_qr;
DROP DATABASE IF EXISTS aviqr_hotel;
DROP DATABASE IF EXISTS aviqr_mall;
DROP DATABASE IF EXISTS aviqr_support;
DROP DATABASE IF EXISTS aviqr_report;
DROP DATABASE IF EXISTS aviqr_review;

-- Create all 11 service databases
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
\connect "dbname=aviqr_auth host=localhost user=aviqr password=aviqr_secret"

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
-- Passwords are all: Axis321#  (bcrypt $2b$12$)
INSERT INTO users (id, email, phone, password_hash, name, role, status, avatar, shop_id, email_verified, phone_verified, preferred_language, created_at) VALUES
  ('3cfd0b53-3eec-4285-af6a-9e0b115303ff', 'admin@aviqr.in',               '9999000001', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Priya Mehta',       'ADMIN',    'ACTIVE', 'PM', NULL,                                 TRUE,  TRUE,  'en', NOW() - INTERVAL '180 days'),
  ('d4eaf7a7-6cce-41eb-916c-6d52336107be', 'support@aviqr.in',      '9999000002', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Arjun Nair',        'SUPPORT',  'ACTIVE', 'AN', NULL,                                 TRUE,  TRUE,  'en', NOW() - INTERVAL '150 days'),
  ('6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', 'sujeet@spiceroute.in',  '9845012345', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Sujeet Narayanan',  'OWNER',    'ACTIVE', 'SN', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', TRUE,  TRUE,  'kn', NOW() - INTERVAL '90 days'),
  ('3580a702-e960-4a40-83eb-a596c88595f7', 'meena@coconut.in',      '9876500001', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Meena Pillai',      'OWNER',    'ACTIVE', 'MP', '44aeca17-767e-410b-868f-9fdd593fa091', TRUE,  TRUE,  'ml', NOW() - INTERVAL '80 days'),
  ('d7ad7958-b4dc-4b94-8a8f-f4cfe39f0179', 'farhan@biryani.in',     '9988776600', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Farhan Khan',       'OWNER',    'SUSPENDED','FK', 'e8754df0-7965-400a-8923-35543d8a698b', TRUE,  TRUE,  'hi', NOW() - INTERVAL '70 days'),
  ('640e1946-5ffe-41cb-8be5-8ba499c08bd2', 'gm@grandpalace.in',     '8011223344', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Grand Palace Hotel','HOTEL',    'ACTIVE', 'GP', NULL,                                 TRUE,  TRUE,  'en', NOW() - INTERVAL '60 days'),
  ('e3e551fa-0ede-4317-b7b1-015648bcdb94', 'admin@forum.in',        '7700112233', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Forum Mall Admin',  'MALL',     'ACTIVE', 'FM', NULL,                                 TRUE,  FALSE, 'en', NOW() - INTERVAL '50 days'),
  ('3c34f672-3059-42f8-8bbb-613f517c8324', 'ramesh@teas.in',        '9988776655', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Ramesh Enterprises','SUPPLIER', 'ACTIVE', 'RE', NULL,                                 TRUE,  TRUE,  'hi', NOW() - INTERVAL '120 days'),
  ('43ff4c07-a85e-4ec0-be79-9cd05b78f94a', 'vikram@gmail.com',      '9900112233', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Vikram Sharma',     'MANAGER',  'ACTIVE', 'VS', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', TRUE,  TRUE,  'en', NOW() - INTERVAL '60 days'),
  ('24e349fe-42b8-4ac1-b202-99261aac3165', 'anjali@gmail.com',      '9876543210', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Anjali Singh',      'CUSTOMER', 'ACTIVE', 'AS', NULL,                                 TRUE,  TRUE,  'hi', NOW() - INTERVAL '30 days'),
  ('223f40ff-4020-4baf-8d8e-44e347263bd1', 'ravi@gmail.com',        '9123456789', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Ravi Kumar',        'CUSTOMER', 'ACTIVE', 'RK', NULL,                                 FALSE, FALSE, 'ta', NOW() - INTERVAL '15 days'),
  ('f4512249-1a01-4be8-bf08-93e312202827', 'priya@cake.in',         '9900001122', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Priya Menon',       'OWNER',    'ACTIVE', 'PM', '67685266-6b45-4e40-851c-8277ef650ca3', TRUE,  TRUE,  'ml', NOW() - INTERVAL '45 days'),
  ('26388851-77d5-4e7a-9d48-c382a14c8b9f', 'kitchen@spiceroute.in', '9845012346', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Chef Rangan',       'KITCHEN',  'ACTIVE', 'CR', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', TRUE,  TRUE,  'kn', NOW() - INTERVAL '45 days'),
  ('ccfb3287-2870-474f-9dcc-e4a3140eee05', 'cashier@spiceroute.in', '9845012347', '$2b$12$.4Rt1tBa78eWphD0gMfSWOQ8M1XPIdfoX06jOHcY5/9IqfMTwivEG', 'Deepa Cashier',     'CASHIER',  'ACTIVE', 'DC', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', TRUE,  TRUE,  'en', NOW() - INTERVAL '30 days');

INSERT INTO otp_records (id, target, otp, type, expires_at, used, created_at) VALUES
  (gen_random_uuid(), '9845012345', '$2a$12$abc123', 'PHONE_LOGIN', NOW() + INTERVAL '10 minutes', FALSE, NOW()),
  (gen_random_uuid(), '9876543210', '$2a$12$def456', 'PHONE_LOGIN', NOW() - INTERVAL '20 minutes', TRUE,  NOW() - INTERVAL '25 minutes');


-- ============================================================
--  SECTION 3 — aviqr_shop
-- ============================================================
\connect "dbname=aviqr_shop host=localhost user=aviqr password=aviqr_secret"

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
    rating            DECIMAL(3,2)  DEFAULT 0,
    rating_count      INTEGER       DEFAULT 0,
    completion_rate   DECIMAL(5,2)  DEFAULT 0,
    sales_volume      DECIMAL(14,2) DEFAULT 0,
    return_percentage DECIMAL(5,2)  DEFAULT 0,
    satisfaction_score DECIMAL(5,2) DEFAULT 0,
    tier              VARCHAR(20)   DEFAULT 'NEW',
    tier_updated_at   TIMESTAMP,
    created_at        TIMESTAMP     DEFAULT NOW(),
    updated_at        TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_shops_owner_id ON shops (owner_id);
CREATE INDEX idx_shops_city     ON shops (city);
CREATE INDEX idx_shops_status   ON shops (status);
CREATE INDEX idx_shops_tier     ON shops (tier);

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

-- ── Loyalty program tables ────────────────────────────────────
CREATE TABLE loyalty_accounts (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone  VARCHAR(20)   NOT NULL,
    customer_name   VARCHAR(200),
    shop_id         VARCHAR(100)  NOT NULL,
    total_points    INTEGER       DEFAULT 0,
    lifetime_points INTEGER       DEFAULT 0,
    total_orders    INTEGER       DEFAULT 0,
    total_visits    INTEGER       DEFAULT 0,
    total_spent     NUMERIC(12,2),
    created_at      TIMESTAMP     DEFAULT NOW(),
    updated_at      TIMESTAMP     DEFAULT NOW(),
    last_visit_at   TIMESTAMP,
    UNIQUE (customer_phone, shop_id)
);
CREATE INDEX idx_loyalty_phone_shop ON loyalty_accounts (customer_phone, shop_id);
CREATE INDEX idx_loyalty_shop       ON loyalty_accounts (shop_id);

-- ── Customer Portal: favorite shops (phone-keyed, same lightweight identity
--    model as loyalty_accounts — no customer account/password required) ──
CREATE TABLE customer_favorites (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone VARCHAR(255) NOT NULL,
    shop_id        VARCHAR(255) NOT NULL,
    created_at     TIMESTAMP    DEFAULT NOW(),
    UNIQUE (customer_phone, shop_id)
);
CREATE INDEX idx_favorite_phone ON customer_favorites (customer_phone);

CREATE TABLE loyalty_transactions (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_account_id  UUID         NOT NULL,
    shop_id             VARCHAR(100),
    order_id            VARCHAR(200),
    type                VARCHAR(20)  NOT NULL,
    points              INTEGER      NOT NULL,
    order_amount        NUMERIC(12,2),
    description         TEXT,
    created_at          TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX idx_lt_account ON loyalty_transactions (loyalty_account_id);

-- ── Sequence for shop reference numbers ──────────────────────
CREATE SEQUENCE seq_shop_ref START 1001 INCREMENT 1;

-- ── Dummy data — shops ────────────────────────────────────────
INSERT INTO shops (id, name, tagline, owner_id, phone, email, address, city, state, pincode, gstin, subscription_plan, min_order_amount, table_count, status, rating, rating_count, completion_rate, sales_volume, return_percentage, satisfaction_score, tier, latitude, longitude, created_at) VALUES
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Spice Route',        'Authentic South Indian flavours',   '6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', '9845012345', 'hello@spiceroute.in', '12, MG Road, Indiranagar',       'Bengaluru', 'Karnataka',   '560038', '29AABCU9603R1ZM', 'GROWTH',   100, 12, 'ACTIVE',   4.50, 320, 87.50, 284000.00, 2.10, 88.50, 'GOLD',    12.97194, 77.64115, NOW() - INTERVAL '90 days'),
  ('44aeca17-767e-410b-868f-9fdd593fa091', 'The Coconut Grove',  'Kerala cuisine at its finest',      '3580a702-e960-4a40-83eb-a596c88595f7', '9876500001', 'hello@coconut.in',    '45, Marine Drive, Fort Kochi',   'Kochi',     'Kerala',      '682001', '32AADFC1234R1ZM', 'BUSINESS', 150, 20, 'ACTIVE',   4.30, 180, 82.00, 156000.00, 3.50, 83.00, 'SILVER',  9.93988,  76.26022, NOW() - INTERVAL '80 days'),
  ('e8754df0-7965-400a-8923-35543d8a698b', 'Biryani House',      'Hyderabadi dum biryani specialists','d7ad7958-b4dc-4b94-8a8f-f4cfe39f0179', '9988776600', 'hello@biryani.in',    '78, Linking Road, Bandra',       'Mumbai',    'Maharashtra', '400050', '27AABFB5678R1ZM', 'GROWTH',   200, 8,  'SUSPENDED',3.80,  90,  65.00,  72000.00, 8.20, 62.00, 'BRONZE',  19.05972,  72.83569, NOW() - INTERVAL '70 days'),
  ('67685266-6b45-4e40-851c-8277ef650ca3', 'Cake Studio',        'Artisanal cakes & desserts',        'f4512249-1a01-4be8-bf08-93e312202827', '9900001122', 'hello@cakestudio.in', '23, Connaught Place',            'Delhi',     'Delhi',       '110001', '07AABCC9012R1ZM', 'STARTER',  50,  4,  'ACTIVE',   4.70,  55,  91.00,  48000.00, 1.50, 90.00, 'BRONZE',  28.63287,  77.21988, NOW() - INTERVAL '45 days'),
  ('0699ee91-c5b8-4b7f-94b7-19d2d0c13420', 'Chai & Chaat',       'Street food with a twist',          '6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', '9845099999', 'hello@chaichaat.in',  '5, FC Road, Shivajinagar',       'Pune',      'Maharashtra', '411004', '27AABFC3456R1ZM', 'STARTER',  80,  6,  'ACTIVE',   4.10,  30,  75.00,  22000.00, 4.00, 76.00, 'NEW',     18.51957,  73.85535, NOW() - INTERVAL '30 days');

-- Opening hours for Spice Route (all days)
INSERT INTO shop_opening_hours (shop_id, day_of_week, open, open_time, close_time) VALUES
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'MONDAY',    TRUE, '10:00', '22:30'),
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'TUESDAY',   TRUE, '10:00', '22:30'),
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'WEDNESDAY',  TRUE, '10:00', '22:30'),
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'THURSDAY',  TRUE, '10:00', '22:30'),
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'FRIDAY',    TRUE, '10:00', '23:00'),
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'SATURDAY',  TRUE, '10:00', '23:00'),
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', 'SUNDAY',    TRUE, '11:00', '22:00');

-- Staff for Spice Route
INSERT INTO shop_staff (id, shop_id, user_id, name, phone, email, avatar, role, active) VALUES
  ('9ed3025a-01ce-40d3-b83e-bccf6e53c264', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '43ff4c07-a85e-4ec0-be79-9cd05b78f94a', 'Vikram Sharma',  '9900112233', 'vikram@gmail.com',      'VS', 'MANAGER',  TRUE),
  ('be16b07b-a184-481a-bd58-85a4b26751c3', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '26388851-77d5-4e7a-9d48-c382a14c8b9f', 'Chef Rangan',    '9845012346', 'kitchen@spiceroute.in', 'CR', 'KITCHEN',  TRUE),
  ('a4be1486-ecae-43dd-a6d1-9cb9441acdc6', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'ccfb3287-2870-474f-9dcc-e4a3140eee05', 'Deepa Cashier',  '9845012347', 'cashier@spiceroute.in', 'DC', 'CASHIER',  TRUE),
  ('331cc4ea-b779-4711-ac03-4f6f458fd301', '44aeca17-767e-410b-868f-9fdd593fa091', '43ff4c07-a85e-4ec0-be79-9cd05b78f94a', 'Anoop Waiter',   '9876500010', 'anoop@coconut.in',      'AW', 'ORDER_VIEWER', TRUE);

INSERT INTO staff_permissions (shop_staff_id, permissions) VALUES
  ('9ed3025a-01ce-40d3-b83e-bccf6e53c264', 'VIEW_ORDERS'),
  ('9ed3025a-01ce-40d3-b83e-bccf6e53c264', 'UPDATE_ORDER_STATUS'),
  ('9ed3025a-01ce-40d3-b83e-bccf6e53c264', 'VIEW_REPORTS'),
  ('be16b07b-a184-481a-bd58-85a4b26751c3', 'VIEW_ORDERS'),
  ('be16b07b-a184-481a-bd58-85a4b26751c3', 'UPDATE_ORDER_STATUS'),
  ('a4be1486-ecae-43dd-a6d1-9cb9441acdc6', 'VIEW_ORDERS'),
  ('a4be1486-ecae-43dd-a6d1-9cb9441acdc6', 'ACCEPT_PAYMENT');

INSERT INTO shop_settings (shop_id, cash_enabled, online_enabled, wallet_enabled, tax_percent, loyalty_enabled, loyalty_points_per_rupee, business_name) VALUES
  ('ecdbc557-91fa-44ee-992f-03683ad8bbde', TRUE, TRUE, TRUE,  5.00, TRUE,  10, 'Spice Route Restaurant Pvt Ltd'),
  ('44aeca17-767e-410b-868f-9fdd593fa091', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'The Coconut Grove Foods'),
  ('e8754df0-7965-400a-8923-35543d8a698b', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'Biryani House Mumbai'),
  ('67685266-6b45-4e40-851c-8277ef650ca3', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'Cake Studio Delhi'),
  ('0699ee91-c5b8-4b7f-94b7-19d2d0c13420', TRUE, FALSE,FALSE, 5.00, FALSE, 1, 'Chai and Chaat Pune'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'Ramesh Tea House MG Road'),
  ('da4440f6-1b19-48a4-8587-532474a3c258', TRUE, TRUE, FALSE, 5.00, FALSE, 1, 'Ramesh Tea House Koramangala'),
  ('79292444-6912-4336-9894-1d89c18894d4', TRUE, FALSE,FALSE, 5.00, FALSE, 1, 'Ramesh Tea House Whitefield');

-- Ramesh Tea House outlets (SUPPLIER user — 3 linked shops)
INSERT INTO shops (id, name, tagline, owner_id, phone, email, address, city, state, pincode, subscription_plan, min_order_amount, table_count, status, rating, rating_count, completion_rate, created_at) VALUES
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'Ramesh Tea House — MG Road',     'Authentic filter coffee & South Indian snacks', '3c34f672-3059-42f8-8bbb-613f517c8324', '9988776601', 'mgroad@rameshteas.in',  '23, MG Road',          'Bengaluru', 'Karnataka', '560001', 'GROWTH',  50, 8, 'ACTIVE', 4.20, 180, 91.00, NOW() - INTERVAL '60 days'),
  ('da4440f6-1b19-48a4-8587-532474a3c258', 'Ramesh Tea House — Koramangala', 'South Indian tiffin & beverages',               '3c34f672-3059-42f8-8bbb-613f517c8324', '9988776602', 'kora@rameshteas.in',    '7th Block, Koramangala','Bengaluru', 'Karnataka', '560095', 'GROWTH',  50, 6, 'ACTIVE', 4.10, 120, 88.00, NOW() - INTERVAL '55 days'),
  ('79292444-6912-4336-9894-1d89c18894d4', 'Ramesh Tea House — Whitefield',  'Quick bites & refreshing beverages',            '3c34f672-3059-42f8-8bbb-613f517c8324', '9988776603', 'wf@rameshteas.in',      'Whitefield Main Road',  'Bengaluru', 'Karnataka', '560066', 'STARTER', 30, 4, 'ACTIVE', 3.90,  60, 82.00, NOW() - INTERVAL '30 days');

INSERT INTO shop_opening_hours (shop_id, day_of_week, open, open_time, close_time) VALUES
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'MONDAY',    TRUE, '07:00', '21:00'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'TUESDAY',   TRUE, '07:00', '21:00'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'WEDNESDAY',  TRUE, '07:00', '21:00'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'THURSDAY',  TRUE, '07:00', '21:00'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'FRIDAY',    TRUE, '07:00', '21:00'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'SATURDAY',  TRUE, '07:00', '22:00'),
  ('117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'SUNDAY',    TRUE, '08:00', '20:00');


-- ============================================================
--  SECTION 4 — aviqr_menu
-- ============================================================
\connect "dbname=aviqr_menu host=localhost user=aviqr password=aviqr_secret"

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
    video_url      VARCHAR(1000),
    model_url      VARCHAR(1000),
    media_type     VARCHAR(20)   DEFAULT 'NONE',
    veg            BOOLEAN       DEFAULT TRUE,
    spicy          BOOLEAN       DEFAULT FALSE,
    popular        BOOLEAN       DEFAULT FALSE,
    available      BOOLEAN       DEFAULT TRUE,
    tag            VARCHAR(50),
    sort_order     INTEGER       DEFAULT 0,
    sales_volume   INTEGER       DEFAULT 0,
    rating         NUMERIC(3,2)  DEFAULT 0.00,
    rating_count   INTEGER       DEFAULT 0,
    ranking_score  NUMERIC(10,4) DEFAULT 0.0000,
    seo_score      NUMERIC(5,2)  DEFAULT 0.00,
    conversion_rate NUMERIC(5,4) DEFAULT 0.0000,
    created_at     TIMESTAMP     DEFAULT NOW(),
    updated_at     TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_menu_items_shop_id     ON menu_items (shop_id);
CREATE INDEX idx_menu_items_category_id ON menu_items (category_id);
CREATE INDEX idx_menu_items_available   ON menu_items (available);
CREATE INDEX idx_menu_items_veg         ON menu_items (veg);

-- ── stock_items ────────────────────────────────────────────────
CREATE TABLE stock_items (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id        UUID         NOT NULL UNIQUE,
    shop_id             VARCHAR(100) NOT NULL,
    stock_qty           INTEGER,
    low_stock_threshold INTEGER      DEFAULT 5,
    track_stock         BOOLEAN      DEFAULT FALSE,
    updated_at          TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX idx_stock_item_id ON stock_items (menu_item_id);
CREATE INDEX idx_stock_shop    ON stock_items (shop_id);

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
  ('d6f3f776-f2fc-4b6b-a92e-89d74e2d000e', 'Starters',       'स्टार्टर',    'தொடக்க உணவுகள்', 'ಸ್ಟಾರ್ಟರ್‌ಗಳು', '🥗', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 1, TRUE),
  ('be8bc0ff-c579-4620-974c-b4970e5daf6c', 'Main Course',    'मुख्य कोर्स', 'முக்கிய உணவு',   'ಮುಖ್ಯ ಕೋರ್ಸ್',   '🍛', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 2, TRUE),
  ('411b10cc-32a0-41b2-a406-7f49c140ea5a', 'Breads',         'रोटी',         'ரொட்டிகள்',       'ರೊಟ್ಟಿಗಳು',       '🫓', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 3, TRUE),
  ('a24adc4d-ec96-4431-848f-7a3c6e14fe3b', 'Rice & Biryani', 'चावल बिरयानी', 'அரிசி & பிரியாணி','ಅಕ್ಕಿ ಮತ್ತು ಬಿರ್ಯಾನಿ','🍚', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 4, TRUE),
  ('fe68231d-7979-45df-bec5-f3fe45c07e88', 'Desserts',       'मिठाई',        'இனிப்புகள்',       'ಸಿಹಿತಿಂಡಿಗಳು',   '🍮', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 5, TRUE),
  ('0f41f620-6158-4387-b6e0-1448a1472c47', 'Beverages',      'पेय पदार्थ',   'பானங்கள்',         'ಪಾನೀಯಗಳು',        '🥤', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 6, TRUE),
  ('5f023e49-1bb1-49bf-9cb9-758a77e24552', 'Soups',          'सूप',          'சூப்கள்',          'ಸೂಪ್‌ಗಳು',        '🍲', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 7, TRUE);

-- Coconut Grove categories
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  ('993dcb95-3108-4ff5-8218-be3a554990bb', 'Kerala Starters', '🌴', '44aeca17-767e-410b-868f-9fdd593fa091', 1, TRUE),
  ('e02eb9ee-1022-4895-b122-d0c5c4538b48', 'Seafood',         '🦐', '44aeca17-767e-410b-868f-9fdd593fa091', 2, TRUE),
  ('7efccff6-c55e-4551-ac74-ac2f14b7bdce', 'Kerala Mains',    '🍛', '44aeca17-767e-410b-868f-9fdd593fa091', 3, TRUE),
  ('e53d6995-27cf-468f-a091-306e446243ba', 'Drinks',          '🥥', '44aeca17-767e-410b-868f-9fdd593fa091', 4, TRUE);

-- ── Dummy data — menu_items (Spice Route) ────────────────────
INSERT INTO menu_items (id, name, name_hi, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  -- Starters
  ('a9ab05b0-202c-4188-a0de-1ac8fb85f91b', 'Paneer Tikka',             'पनीर टिक्का',       'Marinated cottage cheese grilled in tandoor with bell peppers',               'd6f3f776-f2fc-4b6b-a92e-89d74e2d000e', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 280.00, TRUE,  FALSE, TRUE,  TRUE,  'bestseller', 1),
  ('22e7cfad-52e1-4f52-bcca-03a6d31227fe', 'Veg Seekh Kebab',          'वेज सीख कबाब',     'Mixed vegetable and paneer kebabs on skewers',                                'd6f3f776-f2fc-4b6b-a92e-89d74e2d000e', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 220.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  ('dc053f69-0fe3-4610-a4f8-c2feb7a9d291', 'Chicken Tikka',            'चिकन टिक्का',      'Tender chicken marinated in yoghurt and spices, char-grilled',                'd6f3f776-f2fc-4b6b-a92e-89d74e2d000e', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 320.00, FALSE, TRUE,  TRUE,  TRUE,  'spicy',      3),
  ('66ba8eb6-b199-4d5d-9cf3-fa19521ea5b1', 'Samosa (2 pcs)',           'समोसा',             'Crispy fried pastry with spiced potato and pea filling',                      'd6f3f776-f2fc-4b6b-a92e-89d74e2d000e', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 80.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         4),
  ('54f00ad4-9253-4ab8-866d-3e7009b97844', 'Mushroom Pepper Fry',      'मशरूम पेपर फ्राय', 'Sautéed button mushrooms tossed with black pepper and herbs',                 'd6f3f776-f2fc-4b6b-a92e-89d74e2d000e', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 240.00, TRUE,  TRUE,  FALSE, TRUE,  'new',        5),
  -- Main Course
  ('5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala',     'पनीर बटर मसाला',   'Rich creamy tomato-cashew gravy with soft paneer cubes',                      'be8bc0ff-c579-4620-974c-b4970e5daf6c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 320.00, TRUE,  FALSE, TRUE,  TRUE,  'bestseller', 1),
  ('40b195f0-633a-42ac-86ef-f06b87d62934', 'Dal Makhani',              'दाल मखनी',         'Black lentils slow-cooked overnight in butter and cream',                     'be8bc0ff-c579-4620-974c-b4970e5daf6c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 280.00, TRUE,  FALSE, TRUE,  TRUE,  'bestseller', 2),
  ('692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',           'बटर चिकन',         'Tender chicken in a velvety tomato-butter sauce',                             'be8bc0ff-c579-4620-974c-b4970e5daf6c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 380.00, FALSE, FALSE, TRUE,  TRUE,  'bestseller', 3),
  ('e867d826-f3af-4959-8fde-cb2e8cd0a521', 'Palak Paneer',             'पालक पनीर',        'Cottage cheese in smooth spinach gravy',                                      'be8bc0ff-c579-4620-974c-b4970e5daf6c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 300.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         4),
  ('bbcba77a-d3dc-4497-a151-cc04e6bec540', 'Chicken Kadai',            'चिकन कढ़ाई',       'Chicken cooked with kadai spices, capsicum and tomatoes',                     'be8bc0ff-c579-4620-974c-b4970e5daf6c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 360.00, FALSE, TRUE,  FALSE, TRUE,  'spicy',      5),
  ('7483c8d3-06c7-4510-bfe7-e7e9cd4ad2f0', 'Shahi Paneer',             'शाही पनीर',        'Paneer in rich Mughlai gravy with cashews and cream',                         'be8bc0ff-c579-4620-974c-b4970e5daf6c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 340.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         6),
  -- Breads
  ('8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',              'बटर नान',          'Soft leavened bread baked in tandoor, brushed with butter',                   '411b10cc-32a0-41b2-a406-7f49c140ea5a', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 55.00,  TRUE,  FALSE, TRUE,  TRUE,  NULL,         1),
  ('21d56a25-8a99-4f72-ae5c-5fbd4818adc8', 'Garlic Naan',              'गार्लिक नान',      'Naan topped with fresh garlic and coriander',                                 '411b10cc-32a0-41b2-a406-7f49c140ea5a', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 65.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  ('cf3b5823-5263-481a-b48c-979f36ee45e4', 'Laccha Paratha',           'लच्छा पराठा',      'Multi-layered crispy whole wheat paratha',                                    '411b10cc-32a0-41b2-a406-7f49c140ea5a', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 60.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         3),
  ('4b7f99f0-87f2-4775-a156-540ebaa6b8fa', 'Tandoori Roti',            'तंदूरी रोटी',      'Whole wheat bread baked in clay oven',                                        '411b10cc-32a0-41b2-a406-7f49c140ea5a', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 40.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         4),
  -- Rice & Biryani
  ('155936e0-957e-4215-aa80-f27a7bc63c54', 'Veg Dum Biryani',          'वेज दम बिरयानी',  'Fragrant basmati rice layered with vegetables and whole spices',              'a24adc4d-ec96-4431-848f-7a3c6e14fe3b', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 260.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         1),
  ('8961dab4-323d-45cf-b7f6-f6e1dc1086c7', 'Chicken Biryani',          'चिकन बिरयानी',    'Hyderabadi-style dum biryani with tender chicken',                            'a24adc4d-ec96-4431-848f-7a3c6e14fe3b', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 360.00, FALSE, TRUE,  TRUE,  TRUE,  'bestseller', 2),
  ('298d881f-58ea-4fd0-8667-b2b12a01493a', 'Jeera Rice',               'जीरा राइस',        'Basmati rice tempered with cumin seeds and ghee',                             'a24adc4d-ec96-4431-848f-7a3c6e14fe3b', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 120.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         3),
  -- Desserts
  ('f7b34ab7-f703-4e71-9705-f131d55ebafe', 'Gulab Jamun (2 pcs)',      'गुलाब जामुन',     'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup',              'fe68231d-7979-45df-bec5-f3fe45c07e88', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 90.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         1),
  ('972552bb-af38-4455-8b42-cd871f26a2cb', 'Kulfi Falooda',            'कुल्फी फालूदा',   'Dense Indian ice cream with falooda noodles and rose syrup',                  'fe68231d-7979-45df-bec5-f3fe45c07e88', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 140.00, TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  -- Beverages
  ('9bde5fa9-5627-4154-9d49-360b5948bf20', 'Masala Chai',              'मसाला चाय',        'Freshly brewed spiced Indian tea with milk',                                  '0f41f620-6158-4387-b6e0-1448a1472c47', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 40.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         1),
  ('ab52d364-8302-4122-b708-2629638349f0', 'Sweet Lassi',              'मीठी लस्सी',      'Chilled yoghurt drink sweetened with sugar and rose water',                   '0f41f620-6158-4387-b6e0-1448a1472c47', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 80.00,  TRUE,  FALSE, TRUE,  TRUE,  NULL,         2),
  ('46cd7a1d-bf01-4fc7-bb18-47608faaf2b9', 'Fresh Lime Soda',          'नींबू सोडा',       'Freshly squeezed lime with soda, salted or sweet',                            '0f41f620-6158-4387-b6e0-1448a1472c47', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 60.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         3),
  ('2656822a-5b54-45b5-908b-f3838bfa20a6', 'Mango Lassi',              'मैंगो लस्सी',     'Thick yoghurt blended with fresh Alphonso mango pulp',                        '0f41f620-6158-4387-b6e0-1448a1472c47', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 100.00, TRUE,  FALSE, FALSE, TRUE,  'seasonal',   4);

-- Coconut Grove menu items
INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order) VALUES
  ('f2d406f1-6dd9-4a5c-940b-40b87921983a', 'Prawn Koliwada',   'Crispy fried prawns with coastal spices',                  '993dcb95-3108-4ff5-8218-be3a554990bb', '44aeca17-767e-410b-868f-9fdd593fa091', 360.00, FALSE, TRUE,  TRUE,  TRUE,  'bestseller', 1),
  ('3012baf3-b6bd-426c-997a-4147afc47dd1', 'Kerala Fish Curry','Traditional fish curry in coconut milk and kudampuli',      '7efccff6-c55e-4551-ac74-ac2f14b7bdce', '44aeca17-767e-410b-868f-9fdd593fa091', 420.00, FALSE, TRUE,  TRUE,  TRUE,  'bestseller', 1),
  ('a050595b-db30-4df3-89f6-39209ed9bb34', 'Appam',            'Soft lacy rice hoppers served with stew',                  '7efccff6-c55e-4551-ac74-ac2f14b7bdce', '44aeca17-767e-410b-868f-9fdd593fa091', 80.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         2),
  ('fcf73d5b-5ee5-432d-8bc1-860a88ee1f1d', 'Tender Coconut',   'Fresh tender coconut water straight from the shell',       'e53d6995-27cf-468f-a091-306e446243ba', '44aeca17-767e-410b-868f-9fdd593fa091', 80.00,  TRUE,  FALSE, TRUE,  TRUE,  NULL,         1),
  ('a5f40e9c-927c-4a23-b438-14d9f81ade26', 'Nannari Sherbet',  'Refreshing Indian sarsaparilla syrup with lemon',          'e53d6995-27cf-468f-a091-306e446243ba', '44aeca17-767e-410b-868f-9fdd593fa091', 60.00,  TRUE,  FALSE, FALSE, TRUE,  NULL,         2);

-- Biryani House categories (OWNER Farhan — suspended but menu still required)
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  (gen_random_uuid(), 'Biryani',   '🍚', 'e8754df0-7965-400a-8923-35543d8a698b', 1, TRUE),
  (gen_random_uuid(), 'Starters',  '🍗', 'e8754df0-7965-400a-8923-35543d8a698b', 2, TRUE),
  (gen_random_uuid(), 'Breads',    '🫓', 'e8754df0-7965-400a-8923-35543d8a698b', 3, TRUE),
  (gen_random_uuid(), 'Beverages', '🥤', 'e8754df0-7965-400a-8923-35543d8a698b', 4, TRUE);

INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order)
SELECT gen_random_uuid(), v.name, v.description, c.id, v.shop_id, v.price, v.veg, v.spicy, v.popular, TRUE, v.tag, v.sort_order
FROM (VALUES
  ('Hyderabadi Chicken Dum Biryani', 'Slow-cooked dum biryani with tender chicken, aged basmati and whole spices',  'e8754df0-7965-400a-8923-35543d8a698b', 320.00, FALSE, TRUE,  TRUE,  'bestseller', 1, 'Biryani'),
  ('Mutton Dum Biryani',             'Royal mutton biryani slow-cooked with saffron and fried onions',              'e8754df0-7965-400a-8923-35543d8a698b', 420.00, FALSE, TRUE,  TRUE,  'bestseller', 2, 'Biryani'),
  ('Veg Dum Biryani',                'Fragrant vegetable biryani with cashews, raisins and rose water',             'e8754df0-7965-400a-8923-35543d8a698b', 220.00, TRUE,  FALSE, FALSE, NULL,         3, 'Biryani'),
  ('Chicken 65',                     'Crispy deep-fried chicken in ginger-garlic and red chilli paste',             'e8754df0-7965-400a-8923-35543d8a698b', 280.00, FALSE, TRUE,  TRUE,  'spicy',      1, 'Starters'),
  ('Raita',                          'Chilled yoghurt with cucumber, onion and mild spices',                        'e8754df0-7965-400a-8923-35543d8a698b',  60.00, TRUE,  FALSE, FALSE, NULL,         1, 'Breads'),
  ('Soft Drink (can)',               'Chilled cola, lemon or orange can — 330 ml',                                  'e8754df0-7965-400a-8923-35543d8a698b',  50.00, TRUE,  FALSE, FALSE, NULL,         1, 'Beverages')
) AS v(name, description, shop_id, price, veg, spicy, popular, tag, sort_order, cat_name)
JOIN categories c ON c.shop_id = v.shop_id AND c.name = v.cat_name;

-- Ramesh Tea House categories (SUPPLIER user outlets)
INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  (gen_random_uuid(), 'Filter Coffee & Tea', '☕', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 1, TRUE),
  (gen_random_uuid(), 'Snacks',              '🥨', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 2, TRUE),
  (gen_random_uuid(), 'Cold Beverages',      '🥤', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 3, TRUE),
  (gen_random_uuid(), 'Filter Coffee & Tea', '☕', 'da4440f6-1b19-48a4-8587-532474a3c258', 1, TRUE),
  (gen_random_uuid(), 'Snacks',              '🥨', 'da4440f6-1b19-48a4-8587-532474a3c258', 2, TRUE),
  (gen_random_uuid(), 'Filter Coffee & Tea', '☕', '79292444-6912-4336-9894-1d89c18894d4', 1, TRUE),
  (gen_random_uuid(), 'Snacks',              '🥨', '79292444-6912-4336-9894-1d89c18894d4', 2, TRUE);

INSERT INTO menu_items (id, name, description, category_id, shop_id, price, veg, spicy, popular, available, tag, sort_order)
SELECT gen_random_uuid(), v.name, v.description, c.id, v.shop_id, v.price, TRUE, FALSE, v.popular, TRUE, v.tag, v.sort_order
FROM (VALUES
  ('Filter Coffee (Small)', 'South Indian filter coffee — 100 ml decoction with frothy milk',  '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  30.00, TRUE,  'bestseller', 1, 'Filter Coffee & Tea'),
  ('Filter Coffee (Large)', 'Double-shot South Indian filter coffee — 200 ml tumbler',          '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  50.00, TRUE,  NULL,         2, 'Filter Coffee & Tea'),
  ('Masala Tea',            'Ginger, cardamom & cinnamon spiced milk tea',                      '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  25.00, FALSE, NULL,         3, 'Filter Coffee & Tea'),
  ('Vada (2 pcs)',          'Crispy medu vada with sambar and coconut chutney',                 '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  40.00, TRUE,  'bestseller', 1, 'Snacks'),
  ('Masala Dosa',           'Crispy dosa with spiced potato filling and chutneys',              '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  80.00, TRUE,  NULL,         2, 'Snacks'),
  ('Idli (3 pcs)',          'Soft steamed rice cakes with sambar and two chutneys',             '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  60.00, FALSE, NULL,         3, 'Snacks'),
  ('Buttermilk',            'Chilled spiced buttermilk with coriander and ginger',              '117390e3-f3dc-4ea7-a6e2-1b073f18bad7',  25.00, FALSE, NULL,         1, 'Cold Beverages'),
  ('Filter Coffee (Small)', 'South Indian filter coffee — 100 ml decoction with frothy milk',  'da4440f6-1b19-48a4-8587-532474a3c258',  30.00, TRUE,  'bestseller', 1, 'Filter Coffee & Tea'),
  ('Filter Coffee (Large)', 'Double-shot South Indian filter coffee — 200 ml tumbler',          'da4440f6-1b19-48a4-8587-532474a3c258',  50.00, FALSE, NULL,         2, 'Filter Coffee & Tea'),
  ('Masala Tea',            'Ginger, cardamom & cinnamon spiced milk tea',                      'da4440f6-1b19-48a4-8587-532474a3c258',  25.00, FALSE, NULL,         3, 'Filter Coffee & Tea'),
  ('Vada (2 pcs)',          'Crispy medu vada with sambar and coconut chutney',                 'da4440f6-1b19-48a4-8587-532474a3c258',  40.00, TRUE,  'bestseller', 1, 'Snacks'),
  ('Masala Dosa',           'Crispy dosa with spiced potato filling and chutneys',              'da4440f6-1b19-48a4-8587-532474a3c258',  80.00, TRUE,  NULL,         2, 'Snacks'),
  ('Filter Coffee',         'South Indian filter coffee — strong decoction with frothy milk',   '79292444-6912-4336-9894-1d89c18894d4',  35.00, TRUE,  'bestseller', 1, 'Filter Coffee & Tea'),
  ('Masala Tea',            'Ginger, cardamom & cinnamon spiced milk tea',                      '79292444-6912-4336-9894-1d89c18894d4',  25.00, FALSE, NULL,         2, 'Filter Coffee & Tea'),
  ('Vada (2 pcs)',          'Crispy medu vada with sambar and chutney',                         '79292444-6912-4336-9894-1d89c18894d4',  40.00, TRUE,  NULL,         1, 'Snacks'),
  ('Idli (3 pcs)',          'Soft steamed rice cakes with sambar and chutney',                  '79292444-6912-4336-9894-1d89c18894d4',  60.00, FALSE, NULL,         2, 'Snacks')
) AS v(name, description, shop_id, price, popular, tag, sort_order, cat_name)
JOIN categories c ON c.shop_id = v.shop_id AND c.name = v.cat_name;

-- Pricing rules
INSERT INTO pricing_rules (id, shop_id, name, type, from_time, to_time, adjustment_type, adjustment_value, priority, active) VALUES
  ('217cb158-006e-4406-977a-35c21fef972c', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Happy Hours (3–6 PM)',  'TIME', '15:00', '18:00', 'PERCENTAGE_DECREASE', 10.00, 1, TRUE),
  ('8aec29fb-b9b9-4503-b245-44419a666b77', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Weekend Surcharge',    'DAY',  NULL,    NULL,    'PERCENTAGE_INCREASE',  5.00,  2, TRUE);

UPDATE pricing_rules SET days_of_week = '["SATURDAY","SUNDAY"]'
  WHERE id = '8aec29fb-b9b9-4503-b245-44419a666b77';


-- ============================================================
--  SECTION 5 — aviqr_order
-- ============================================================
\connect "dbname=aviqr_order host=localhost user=aviqr password=aviqr_secret"

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
    hotel_id       UUID,         -- set when payment_method=ROOM_CHARGE (hotel outlet order)
    room_number    VARCHAR(255), -- set when payment_method=ROOM_CHARGE
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
  ('8f95e3c3-ef6b-40a7-8796-855b021297f6', 'ORD-1001', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',   '9876543210', '4',  'DINE_IN',  'COMPLETED', 'ONLINE', 'PAID',    'pay_Abc123xyz001', 685.00,  34.25, 719.25,  NULL,             NOW() - INTERVAL '2 hours', NOW() - INTERVAL '115 min', NOW() - INTERVAL '90 min'),
  ('c80edcef-ed35-49a2-ada2-481ab31b4002', 'ORD-1002', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '223f40ff-4020-4baf-8d8e-44e347263bd1', 'Ravi Kumar',     '9123456789', '7',  'DINE_IN',  'COMPLETED', 'CASH',   'CASH',    NULL,               760.00,  38.00, 798.00,  NULL,             NOW() - INTERVAL '3 hours', NOW() - INTERVAL '175 min', NOW() - INTERVAL '150 min'),
  ('60183b05-bb9a-41f7-81b6-536a88b933ca', 'ORD-1003', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                  'Deepak Joshi',   '9988001122', '2',  'DINE_IN',  'PREPARING', 'ONLINE', 'PAID',    'pay_Def456ghi002', 600.00,  30.00, 630.00,  'Less spicy',     NOW() - INTERVAL '20 min', NOW() - INTERVAL '15 min', NULL),
  ('d2ca1722-356d-41d3-9d9b-a31edbdf04fe', 'ORD-1004', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                  'Sneha Reddy',    '9900445566', '9',  'DINE_IN',  'NEW',       'ONLINE', 'PAID',    'pay_Ghi789jkl003', 440.00,  22.00, 462.00,  NULL,             NOW() - INTERVAL '5 min',  NULL,                       NULL),
  ('fb91ae26-dbcc-4339-8320-fecef5d8e04c', 'ORD-1005', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',   '9876543210', '4',  'DINE_IN',  'READY',     'ONLINE', 'PAID',    'pay_Jkl012mno004', 320.00,  16.00, 336.00,  NULL,             NOW() - INTERVAL '35 min', NOW() - INTERVAL '30 min', NULL),
  ('19223584-6e9a-4b0c-86a3-459845066ee3', 'ORD-1006', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                  'Mohan Verma',    '9900887766', NULL, 'TAKEAWAY', 'COMPLETED', 'ONLINE', 'PAID',    'pay_Mno345pqr005', 380.00,  19.00, 399.00,  NULL,             NOW() - INTERVAL '4 hours', NOW() - INTERVAL '235 min', NOW() - INTERVAL '220 min'),
  ('cbef9f2c-44b0-4e03-8c46-476beb6bee0a', 'ORD-1007', '44aeca17-767e-410b-868f-9fdd593fa091', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',   '9876543210', '3',  'DINE_IN',  'COMPLETED', 'ONLINE', 'PAID',    'pay_Pqr678stu006', 500.00,  25.00, 525.00,  NULL,             NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day',  NOW() - INTERVAL '23 hours'),
  ('e5aa1100-0924-452e-abb2-4ca6aa1fce5e', 'ORD-1008', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                  'Karan Malhotra', '9811223344', '1',  'DINE_IN',  'ACCEPTED',  'CASH',   'PENDING', NULL,               840.00,  42.00, 882.00,  'Extra chapati',  NOW() - INTERVAL '25 min', NOW() - INTERVAL '20 min', NULL);

INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price) VALUES
  -- Order 1
  (gen_random_uuid(), '8f95e3c3-ef6b-40a7-8796-855b021297f6', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala', 1, 320.00, 320.00),
  (gen_random_uuid(), '8f95e3c3-ef6b-40a7-8796-855b021297f6', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',          3,  55.00, 165.00),
  (gen_random_uuid(), '8f95e3c3-ef6b-40a7-8796-855b021297f6', 'ab52d364-8302-4122-b708-2629638349f0', 'Sweet Lassi',          2,  80.00, 160.00),
  (gen_random_uuid(), '8f95e3c3-ef6b-40a7-8796-855b021297f6', 'f7b34ab7-f703-4e71-9705-f131d55ebafe', 'Gulab Jamun (2 pcs)',  1,  90.00,  90.00),
  -- Order 2
  (gen_random_uuid(), 'c80edcef-ed35-49a2-ada2-481ab31b4002', '692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',       1, 380.00, 380.00),
  (gen_random_uuid(), 'c80edcef-ed35-49a2-ada2-481ab31b4002', '8961dab4-323d-45cf-b7f6-f6e1dc1086c7', 'Chicken Biryani',      1, 360.00, 360.00),
  (gen_random_uuid(), 'c80edcef-ed35-49a2-ada2-481ab31b4002', '9bde5fa9-5627-4154-9d49-360b5948bf20', 'Masala Chai',          2,  40.00,  80.00),
  -- Order 3
  (gen_random_uuid(), '60183b05-bb9a-41f7-81b6-536a88b933ca', 'a9ab05b0-202c-4188-a0de-1ac8fb85f91b', 'Paneer Tikka',         1, 280.00, 280.00),
  (gen_random_uuid(), '60183b05-bb9a-41f7-81b6-536a88b933ca', '40b195f0-633a-42ac-86ef-f06b87d62934', 'Dal Makhani',          1, 280.00, 280.00),
  (gen_random_uuid(), '60183b05-bb9a-41f7-81b6-536a88b933ca', '4b7f99f0-87f2-4775-a156-540ebaa6b8fa', 'Tandoori Roti',        1,  40.00,  40.00),
  -- Order 4
  (gen_random_uuid(), 'd2ca1722-356d-41d3-9d9b-a31edbdf04fe', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala', 1, 320.00, 320.00),
  (gen_random_uuid(), 'd2ca1722-356d-41d3-9d9b-a31edbdf04fe', '21d56a25-8a99-4f72-ae5c-5fbd4818adc8', 'Garlic Naan',          2,  65.00, 130.00),
  -- Order 5
  (gen_random_uuid(), 'fb91ae26-dbcc-4339-8320-fecef5d8e04c', '692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',       1, 380.00, 380.00),
  -- Order 8
  (gen_random_uuid(), 'e5aa1100-0924-452e-abb2-4ca6aa1fce5e', 'bbcba77a-d3dc-4497-a151-cc04e6bec540', 'Chicken Kadai',        1, 360.00, 360.00),
  (gen_random_uuid(), 'e5aa1100-0924-452e-abb2-4ca6aa1fce5e', '40b195f0-633a-42ac-86ef-f06b87d62934', 'Dal Makhani',          1, 280.00, 280.00),
  (gen_random_uuid(), 'e5aa1100-0924-452e-abb2-4ca6aa1fce5e', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',          4,  55.00, 220.00);

-- Additional orders for Coconut Grove (Meena — OWNER)
INSERT INTO orders (id, order_number, shop_id, customer_id, customer_name, customer_phone, table_number, type, status, payment_method, payment_status, payment_id, subtotal, tax, total_amount, created_at, accepted_at, completed_at) VALUES
  (gen_random_uuid(), 'ORD-1009', '44aeca17-767e-410b-868f-9fdd593fa091', '223f40ff-4020-4baf-8d8e-44e347263bd1', 'Ravi Kumar',    '9123456789', '5',  'DINE_IN',  'PREPARING', 'ONLINE', 'PAID',    'pay_CG0001',  840.00, 42.00,  882.00,  NOW() - INTERVAL '18 min',  NOW() - INTERVAL '14 min', NULL),
  (gen_random_uuid(), 'ORD-1010', '44aeca17-767e-410b-868f-9fdd593fa091', NULL,                                  'Deepak Joshi',  '9988001122', '2',  'DINE_IN',  'NEW',       'ONLINE', 'PAID',    'pay_CG0002',  500.00, 25.00,  525.00,  NOW() - INTERVAL '7 min',   NULL,                       NULL),
  (gen_random_uuid(), 'ORD-1011', '44aeca17-767e-410b-868f-9fdd593fa091', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',  '9876543210', NULL, 'TAKEAWAY', 'COMPLETED', 'CASH',   'CASH',    NULL,          420.00, 21.00,  441.00,  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '178 min', NOW() - INTERVAL '165 min');

INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price)
SELECT gen_random_uuid(), o.id, v.menu_item_id, v.item_name, v.qty, v.price, v.price * v.qty
FROM (VALUES
  ('ORD-1009', '3012baf3-b6bd-426c-997a-4147afc47dd1'::uuid, 'Kerala Fish Curry',  2, 420.00),
  ('ORD-1010', 'f2d406f1-6dd9-4a5c-940b-40b87921983a'::uuid, 'Prawn Koliwada',     1, 360.00),
  ('ORD-1010', 'fcf73d5b-5ee5-432d-8bc1-860a88ee1f1d'::uuid, 'Tender Coconut',     1,  80.00),
  ('ORD-1010', 'a050595b-db30-4df3-89f6-39209ed9bb34'::uuid, 'Appam',              2,  80.00),
  ('ORD-1011', '3012baf3-b6bd-426c-997a-4147afc47dd1'::uuid, 'Kerala Fish Curry',  1, 420.00)
) AS v(order_number, menu_item_id, item_name, qty, price)
JOIN orders o ON o.order_number = v.order_number AND o.shop_id = '44aeca17-767e-410b-868f-9fdd593fa091';

-- Orders for Ramesh Tea House outlets (SUPPLIER shops)
INSERT INTO orders (id, order_number, shop_id, customer_name, customer_phone, table_number, type, status, payment_method, payment_status, payment_id, subtotal, tax, total_amount, created_at, accepted_at, completed_at) VALUES
  -- MG Road outlet
  (gen_random_uuid(), 'ORD-3001', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'Mohan Verma',    '9900887766', '2', 'DINE_IN',  'COMPLETED', 'CASH',   'CASH',    NULL,          110.00, 5.50, 115.50, NOW() - INTERVAL '30 min',  NOW() - INTERVAL '28 min', NOW() - INTERVAL '15 min'),
  (gen_random_uuid(), 'ORD-3002', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'Sneha Reddy',    '9900445566', '1', 'DINE_IN',  'PREPARING', 'ONLINE', 'PAID',    'pay_RT0001',   80.00, 4.00,  84.00,  NOW() - INTERVAL '10 min',  NOW() - INTERVAL '8 min',  NULL),
  (gen_random_uuid(), 'ORD-3003', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'Karan Malhotra', '9811223344', NULL,'TAKEAWAY', 'COMPLETED', 'CASH',   'CASH',    NULL,           55.00, 2.75,  57.75,  NOW() - INTERVAL '2 hours', NOW() - INTERVAL '118 min', NOW() - INTERVAL '110 min'),
  (gen_random_uuid(), 'ORD-3004', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'Anjali Singh',   '9876543210', '4', 'DINE_IN',  'COMPLETED', 'ONLINE', 'PAID',    'pay_RT0002',  140.00, 7.00, 147.00,  NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '58 min',  NOW() - INTERVAL '40 min'),
  (gen_random_uuid(), 'ORD-3005', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'Ravi Kumar',     '9123456789', '3', 'DINE_IN',  'NEW',       'ONLINE', 'PAID',    'pay_RT0003',   90.00, 4.50,  94.50,  NOW() - INTERVAL '5 min',   NULL,                       NULL),
  -- Koramangala outlet
  (gen_random_uuid(), 'ORD-3006', 'da4440f6-1b19-48a4-8587-532474a3c258', 'Deepak Joshi',   '9988001122', '2', 'DINE_IN',  'COMPLETED', 'CASH',   'CASH',    NULL,          120.00, 6.00, 126.00,  NOW() - INTERVAL '45 min',  NOW() - INTERVAL '43 min', NOW() - INTERVAL '30 min'),
  (gen_random_uuid(), 'ORD-3007', 'da4440f6-1b19-48a4-8587-532474a3c258', 'Priya Desai',    '9000112233', '1', 'DINE_IN',  'READY',     'ONLINE', 'PAID',    'pay_RT0004',   80.00, 4.00,  84.00,  NOW() - INTERVAL '25 min',  NOW() - INTERVAL '23 min', NULL),
  (gen_random_uuid(), 'ORD-3008', 'da4440f6-1b19-48a4-8587-532474a3c258', 'Mohan Verma',    '9900887766', NULL,'TAKEAWAY', 'COMPLETED', 'CASH',   'CASH',    NULL,           55.00, 2.75,  57.75,  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '178 min', NOW() - INTERVAL '165 min'),
  -- Whitefield outlet
  (gen_random_uuid(), 'ORD-3009', '79292444-6912-4336-9894-1d89c18894d4', 'Vivek Iyer',     '9001122334', '1', 'DINE_IN',  'COMPLETED', 'CASH',   'CASH',    NULL,           65.00, 3.25,  68.25,  NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '58 min',  NOW() - INTERVAL '45 min'),
  (gen_random_uuid(), 'ORD-3010', '79292444-6912-4336-9894-1d89c18894d4', 'Sara Thomas',    '9006677889', '2', 'DINE_IN',  'NEW',       'ONLINE', 'PAID',    'pay_RT0005',   35.00, 1.75,  36.75,  NOW() - INTERVAL '8 min',   NULL,                       NULL);

-- Supplier order_items: JOIN on order_number + item name (no hardcoded UUIDs)
INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price)
SELECT gen_random_uuid(), o.id, m.id, r.item_name, r.qty, m.price, m.price * r.qty
FROM (VALUES
  ('ORD-3001', 'Filter Coffee (Small)', 2, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3001', 'Vada (2 pcs)',          1, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3002', 'Masala Dosa',           1, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3003', 'Filter Coffee (Large)', 1, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3004', 'Masala Dosa',           1, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3004', 'Filter Coffee (Small)', 2, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3005', 'Idli (3 pcs)',          1, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3005', 'Masala Tea',            1, '117390e3-f3dc-4ea7-a6e2-1b073f18bad7'),
  ('ORD-3006', 'Filter Coffee (Small)', 2, 'da4440f6-1b19-48a4-8587-532474a3c258'),
  ('ORD-3006', 'Vada (2 pcs)',          1, 'da4440f6-1b19-48a4-8587-532474a3c258'),
  ('ORD-3007', 'Masala Dosa',           1, 'da4440f6-1b19-48a4-8587-532474a3c258'),
  ('ORD-3008', 'Masala Tea',            1, 'da4440f6-1b19-48a4-8587-532474a3c258'),
  ('ORD-3008', 'Vada (2 pcs)',          1, 'da4440f6-1b19-48a4-8587-532474a3c258'),
  ('ORD-3009', 'Filter Coffee',         1, '79292444-6912-4336-9894-1d89c18894d4'),
  ('ORD-3009', 'Vada (2 pcs)',          1, '79292444-6912-4336-9894-1d89c18894d4'),
  ('ORD-3010', 'Filter Coffee',         1, '79292444-6912-4336-9894-1d89c18894d4')
) AS r(order_number, item_name, qty, shop_id)
JOIN orders o ON o.order_number = r.order_number AND o.shop_id = r.shop_id
JOIN menu_items m ON m.shop_id = r.shop_id AND m.name = r.item_name;


-- ============================================================
--  SECTION 6 — aviqr_payment
-- ============================================================
\connect "dbname=aviqr_payment host=localhost user=aviqr password=aviqr_secret"

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
  (gen_random_uuid(), 'pay_Abc123xyz001', 'ORD-1001', 'order_RpAbc001', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '24e349fe-42b8-4ac1-b202-99261aac3165', 719.25, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '115 min'),
  (gen_random_uuid(), 'pay_Def456ghi002', 'ORD-1003', 'order_RpDef002', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                   630.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '22 min',   NOW() - INTERVAL '20 min'),
  (gen_random_uuid(), 'pay_Ghi789jkl003', 'ORD-1004', 'order_RpGhi003', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                   462.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '6 min',    NOW() - INTERVAL '5 min'),
  (gen_random_uuid(), 'pay_Jkl012mno004', 'ORD-1005', 'order_RpJkl004', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '24e349fe-42b8-4ac1-b202-99261aac3165', 336.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '36 min',   NOW() - INTERVAL '34 min'),
  (gen_random_uuid(), 'pay_Mno345pqr005', 'ORD-1006', 'order_RpMno005', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                   399.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '235 min'),
  (gen_random_uuid(), 'pay_Pqr678stu006', 'ORD-1007', 'order_RpPqr006', '44aeca17-767e-410b-868f-9fdd593fa091', '24e349fe-42b8-4ac1-b202-99261aac3165', 525.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '1 day',    NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'pay_FAIL_001',     'ORD-FAIL1', 'order_RpFail01', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                   280.00, 'INR', 'FAILED',   'RAZORPAY', NOW() - INTERVAL '6 hours',  NULL),
  -- Coconut Grove payments
  (gen_random_uuid(), 'pay_CG0001', 'ORD-1009', 'order_CG0001', '44aeca17-767e-410b-868f-9fdd593fa091', '223f40ff-4020-4baf-8d8e-44e347263bd1', 882.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '18 min',  NOW() - INTERVAL '16 min'),
  (gen_random_uuid(), 'pay_CG0002', 'ORD-1010', 'order_CG0002', '44aeca17-767e-410b-868f-9fdd593fa091', NULL,                                   525.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '7 min',   NOW() - INTERVAL '6 min'),
  -- Ramesh Tea House payments
  (gen_random_uuid(), 'pay_RT0001', 'ORD-3002', 'order_RT0001', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', NULL,                                    84.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '10 min',  NOW() - INTERVAL '9 min'),
  (gen_random_uuid(), 'pay_RT0002', 'ORD-3004', 'order_RT0002', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', '24e349fe-42b8-4ac1-b202-99261aac3165', 147.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '59 min'),
  (gen_random_uuid(), 'pay_RT0003', 'ORD-3005', 'order_RT0003', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', '223f40ff-4020-4baf-8d8e-44e347263bd1',  94.50, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '5 min',   NOW() - INTERVAL '4 min'),
  (gen_random_uuid(), 'pay_RT0004', 'ORD-3007', 'order_RT0004', 'da4440f6-1b19-48a4-8587-532474a3c258', NULL,                                    84.00, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '25 min',  NOW() - INTERVAL '24 min'),
  (gen_random_uuid(), 'pay_RT0005', 'ORD-3010', 'order_RT0005', '79292444-6912-4336-9894-1d89c18894d4', NULL,                                    36.75, 'INR', 'CAPTURED', 'RAZORPAY', NOW() - INTERVAL '8 min',   NOW() - INTERVAL '7 min');


-- ============================================================
--  SECTION 7 — aviqr_qr
-- ============================================================
\connect "dbname=aviqr_qr host=localhost user=aviqr password=aviqr_secret"

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
  ('7a507852-145c-4432-80e6-fd04895426ad', 'spiceroute',     'https://aviqr.in/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde',           'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Main Shop QR',   'SHOP',  NULL,  2841, TRUE),
  ('04383cdd-14e4-42e2-a45a-ecdfb42517dd', 'spiceroute-t1',  'https://aviqr.in/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=1',   'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Table 1',        'TABLE', '1',    284, TRUE),
  ('53fe53eb-ef9c-405d-981c-f893825e06a6', 'spiceroute-t2',  'https://aviqr.in/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=2',   'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Table 2',        'TABLE', '2',    312, TRUE),
  ('f56b63f2-b92d-43d3-aa1f-6e44bbeac52b', 'spiceroute-t3',  'https://aviqr.in/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=3',   'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Table 3',        'TABLE', '3',    198, TRUE),
  ('3db703dc-5bd3-4e8b-a108-e734aabe1338', 'spiceroute-t4',  'https://aviqr.in/menu/ecdbc557-91fa-44ee-992f-03683ad8bbde?table=4',   'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'Table 4',        'TABLE', '4',    421, TRUE),
  ('44e8826d-0c17-4842-9baa-3ff4810c1483', 'coconutgrove',   'https://aviqr.in/menu/44aeca17-767e-410b-868f-9fdd593fa091',           '44aeca17-767e-410b-868f-9fdd593fa091', 'Main Shop QR',   'SHOP',  NULL,  1547, TRUE),
  ('461d094f-9f54-4b0d-8870-077fed677b27', 'biryanihouse',   'https://aviqr.in/menu/e8754df0-7965-400a-8923-35543d8a698b',           'e8754df0-7965-400a-8923-35543d8a698b', 'Main Shop QR',   'SHOP',  NULL,   987, FALSE),
  ('8b6d0bee-2372-41f2-9c15-3864bfab19bd', 'cakestudio-del', 'https://aviqr.in/menu/67685266-6b45-4e40-851c-8277ef650ca3',           '67685266-6b45-4e40-851c-8277ef650ca3', 'Main Shop QR',   'SHOP',  NULL,   234, TRUE);

-- Supplier (Ramesh Tea House) QR codes
INSERT INTO qr_codes (id, qr_code, target_url, shop_id, label, type, scan_count, active) VALUES
  (gen_random_uuid(), 'rameshteas-mgrd', 'https://aviqr.in/menu/117390e3-f3dc-4ea7-a6e2-1b073f18bad7', '117390e3-f3dc-4ea7-a6e2-1b073f18bad7', 'MG Road — Main QR',     'SHOP', 412, TRUE),
  (gen_random_uuid(), 'rameshteas-kora', 'https://aviqr.in/menu/da4440f6-1b19-48a4-8587-532474a3c258', 'da4440f6-1b19-48a4-8587-532474a3c258', 'Koramangala — Main QR', 'SHOP', 287, TRUE),
  (gen_random_uuid(), 'rameshteas-wfld', 'https://aviqr.in/menu/79292444-6912-4336-9894-1d89c18894d4', '79292444-6912-4336-9894-1d89c18894d4', 'Whitefield — Main QR',  'SHOP', 143, TRUE);

INSERT INTO qr_scan_logs (id, qr_code, ip_address, user_agent, scanned_at) VALUES
  (gen_random_uuid(), 'spiceroute',       '103.21.58.12',  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',  NOW() - INTERVAL '5 min'),
  (gen_random_uuid(), 'spiceroute-t4',    '103.21.58.13',  'Mozilla/5.0 (Android 13; Mobile)',          NOW() - INTERVAL '12 min'),
  (gen_random_uuid(), 'spiceroute-t2',    '49.207.192.100','Mozilla/5.0 (iPhone; CPU iPhone OS 16_6)',  NOW() - INTERVAL '22 min'),
  (gen_random_uuid(), 'coconutgrove',     '117.197.52.44', 'Mozilla/5.0 (Android 12; Mobile)',          NOW() - INTERVAL '45 min'),
  (gen_random_uuid(), 'spiceroute',       '115.114.88.33', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1)',  NOW() - INTERVAL '1 hour'),
  (gen_random_uuid(), 'rameshteas-mgrd',  '103.21.58.50',  'Mozilla/5.0 (Android 14; Mobile)',          NOW() - INTERVAL '8 min'),
  (gen_random_uuid(), 'rameshteas-kora',  '49.207.192.201','Mozilla/5.0 (iPhone; CPU iPhone OS 17_2)',  NOW() - INTERVAL '30 min'),
  (gen_random_uuid(), 'rameshteas-wfld',  '117.197.52.90', 'Mozilla/5.0 (Android 12; Mobile)',          NOW() - INTERVAL '15 min');


-- ============================================================
--  SECTION 8 — aviqr_hotel
-- ============================================================
\connect "dbname=aviqr_hotel host=localhost user=aviqr password=aviqr_secret"

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
  ('ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Grand Palace Hotel', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', '08011223344', 'gm@grandpalace.in', '45, Anna Salai, Teynampet', 'Chennai',   120, '14:00', '12:00', 'HOTEL_PRO',     TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'The Leela Resort',   '640e1946-5ffe-41cb-8be5-8ba499c08bd2', '08322445566', 'gm@leela.in',       'Calangute Beach Road',      'Goa',       280, '15:00', '11:00', 'RESORT_SUITE',  TRUE),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Budget Inn Jaipur',  '640e1946-5ffe-41cb-8be5-8ba499c08bd2', '01412223344', 'gm@budgetinn.in',   '12, MI Road',               'Jaipur',     40, '12:00', '10:00', 'HOTEL_BASIC',   TRUE);

INSERT INTO hotel_enabled_services (hotel_id, enabled_services) VALUES
  ('ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'ROOM_SERVICE'),
  ('ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'LAUNDRY'),
  ('ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'SPA'),
  ('ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'HOUSEKEEPING'),
  ('ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'MAINTENANCE'),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'ROOM_SERVICE'),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'LAUNDRY'),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'SPA'),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'HOUSEKEEPING'),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'MAINTENANCE'),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f', 'TRANSPORT'),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873', 'ROOM_SERVICE'),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873', 'HOUSEKEEPING');

INSERT INTO rooms (id, hotel_id, room_number, room_type, floor, status, guest_name, check_in_date, check_out_date, qr_active) VALUES
  ('ad1a22ff-c4cd-424a-84ad-505f8847c610', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'Standard',      '1st Floor', 'OCCUPIED',     'Anjali Singh',    'Jun 15, 2026', 'Jun 17, 2026', TRUE),
  ('c581c211-34b7-49c4-87aa-30c5f82ecd6f', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '102', 'Standard',      '1st Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE),
  ('96fd94b6-abff-4063-b33a-988c80e695b3', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '103', 'Standard',      '1st Floor', 'MAINTENANCE',  NULL,              NULL,           NULL,           FALSE),
  ('ede7723a-93e0-4fbc-b6f3-6909dd559613', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'Deluxe',        '2nd Floor', 'OCCUPIED',     'Ravi Kumar',      'Jun 13, 2026', 'Jun 18, 2026', TRUE),
  ('4a8ee55c-81c7-4bf0-90e2-efd322644e4b', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '202', 'Deluxe',        '2nd Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE),
  ('faa9e33d-3d94-486a-b099-3af0c3ba8d5d', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '301', 'Suite',         '3rd Floor', 'OCCUPIED',     'Meena Pillai',    'Jun 14, 2026', 'Jun 20, 2026', TRUE),
  ('16c91a70-661b-447b-8925-7195c1fb476d', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '302', 'Suite',         '3rd Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE),
  ('4024cbc3-0eff-45ce-ab81-5784550d998e', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '401', 'Presidential',  '4th Floor', 'VACANT',       NULL,              NULL,           NULL,           TRUE);

INSERT INTO room_requests (id, hotel_id, room_number, service_type, description, status, priority, created_at) VALUES
  ('a4689441-ede3-4473-98f2-f6a8196945e5', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'ROOM_SERVICE', 'Club Sandwich + Fresh Lime Soda',                    'NEW',       'HIGH',   NOW() - INTERVAL '5 min'),
  ('a2b66295-a0e3-4905-a6e9-c7f03ba4d49d', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'LAUNDRY',      '2 shirts, 1 trouser (express)',                      'PREPARING', 'NORMAL', NOW() - INTERVAL '12 min'),
  ('c6d62dc4-f1f1-4929-94d1-52e675a89309', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '301', 'MAINTENANCE',  'AC not cooling — temperature stuck at 28 degrees',  'PREPARING', 'HIGH',   NOW() - INTERVAL '20 min'),
  ('0f72e9ad-b42d-4c7f-8487-e99e09f17697', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'SPA',          '60-min Swedish Massage at 3 PM for 2 guests',       'CONFIRMED', 'NORMAL', NOW() - INTERVAL '35 min'),
  ('b362ddf3-36d4-4750-a772-fa7081c3eb83', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'ROOM_SERVICE', 'Breakfast for 2 — continental set',                  'DONE',      'NORMAL', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '90 min'),
  ('affb56f6-c6c5-4587-9c0f-1651ca1d4201', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '301', 'HOUSEKEEPING', 'Extra towels (2) and bed pillows (4)',               'DONE',      'NORMAL', NOW() - INTERVAL '1 hour',   NOW() - INTERVAL '45 min');



-- ============================================================
--  SECTION 8b — Hotel Guest Services (v2.3)
--  Outlets, room charges (folio), QR service requests, bookings
--  Tables created explicitly so production (ddl-auto=none) and
--  SQL-based imports both work. JPA will no-op on IF NOT EXISTS.
-- ============================================================

-- ── hotel_outlets ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_outlets (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id     UUID          NOT NULL,
    name         VARCHAR(255)  NOT NULL,
    outlet_type  VARCHAR(30)   DEFAULT 'RESTAURANT',
    description  TEXT,
    location     VARCHAR(150),
    shop_id      VARCHAR(100),
    bookable     BOOLEAN       DEFAULT FALSE,
    active       BOOLEAN       DEFAULT TRUE,
    qr_active    BOOLEAN       DEFAULT TRUE,
    created_at   TIMESTAMP     DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_outlets_hotel ON hotel_outlets (hotel_id);

-- ── room_charges (guest folio) ────────────────────────────────
CREATE TABLE IF NOT EXISTS room_charges (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id       UUID          NOT NULL,
    room_number    VARCHAR(20)   NOT NULL,
    outlet_id      UUID,
    shop_id        VARCHAR(100),
    order_id       VARCHAR(100),
    order_number   VARCHAR(50),
    amount         NUMERIC(10,2),
    description    TEXT,
    status         VARCHAR(20)   DEFAULT 'PENDING',
    guest_name     VARCHAR(150),
    payment_choice VARCHAR(20)   DEFAULT 'CHARGE_TO_ROOM',
    payment_ref    VARCHAR(100),
    created_at     TIMESTAMP     DEFAULT NOW(),
    settled_at     TIMESTAMP,
    settled_by     VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_charges_room ON room_charges (hotel_id, room_number);

-- ── guest_service_requests (QR-raised requests) ───────────────
CREATE TABLE IF NOT EXISTS guest_service_requests (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id      UUID          NOT NULL,
    room_number   VARCHAR(20)   NOT NULL,
    guest_name    VARCHAR(150),
    type          VARCHAR(30)   DEFAULT 'HOUSEKEEPING',
    details       VARCHAR(500),
    priority      VARCHAR(20)   DEFAULT 'NORMAL',
    status        VARCHAR(20)   DEFAULT 'NEW',
    assigned_to   VARCHAR(100),
    created_at    TIMESTAMP     DEFAULT NOW(),
    completed_at  TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gsr_hotel ON guest_service_requests (hotel_id, status);

-- ── outlet_bookings (spa / activity / table slots) ────────────
CREATE TABLE IF NOT EXISTS outlet_bookings (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id       UUID          NOT NULL,
    outlet_id      UUID          NOT NULL,
    outlet_name    VARCHAR(150),
    room_number    VARCHAR(20)   NOT NULL,
    guest_name     VARCHAR(150),
    guest_phone    VARCHAR(20),
    service_name   VARCHAR(200)  NOT NULL,
    price          NUMERIC(10,2),
    booking_date   VARCHAR(20)   NOT NULL,
    booking_time   VARCHAR(10)   NOT NULL,
    party_size     INTEGER       DEFAULT 1,
    notes          VARCHAR(500),
    status         VARCHAR(20)   DEFAULT 'REQUESTED',
    payment_choice VARCHAR(20)   DEFAULT 'CHARGE_TO_ROOM',
    created_at     TIMESTAMP     DEFAULT NOW(),
    confirmed_at   TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ob_hotel  ON outlet_bookings (hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_ob_outlet ON outlet_bookings (outlet_id, booking_date);


-- ── Dummy data — hotel_outlets (Grand Palace Hotel) ───────────
-- shop_id links an outlet to a shop in shop-service for menu/ordering.
-- bookable=TRUE outlets use the booking flow (spa, activities, banquet).
-- Zodiac's shop_id links to the real 'Spice Route' shop (aviqr_shop) so the
-- outlet immediately gets a working menu, staff, settings & loyalty via the
-- reused shop-owner tooling — no separate outlet-shop-provisioning needed for demo data.
INSERT INTO hotel_outlets (id, hotel_id, name, outlet_type, description, location, shop_id, bookable, active, qr_active) VALUES
  ('b1000001-0000-4000-8000-000000000001', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Zodiac — Multi-cuisine Restaurant', 'RESTAURANT', 'All-day dining with Indian, Continental & Asian', 'Lobby Level',      'ecdbc557-91fa-44ee-992f-03683ad8bbde', FALSE, TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000002', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'The Cellar Bar',                    'BAR',        'Cocktails, wines & premium spirits',              '1st Floor',        NULL,       FALSE, TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000003', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Serenity Spa',                      'SPA',        'Ayurvedic & Swedish therapies',                    '2nd Floor',        NULL,       TRUE,  TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000004', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Infinity Pool & Poolside Grill',    'POOL',       'Rooftop pool with light bites & drinks',           'Rooftop',          NULL,       FALSE, TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000005', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Palace Boutique',                   'SHOP',       'Souvenirs, essentials & local crafts',             'Lobby Level',      NULL,       FALSE, TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000006', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'FitZone Gym',                       'GYM',        '24x7 fitness centre',                              'Ground Floor',     NULL,       FALSE, TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000007', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Heritage Walk & City Tours',        'ACTIVITY',   'Guided tours, cab & experience bookings',          'Concierge Desk',   NULL,       TRUE,  TRUE, TRUE),
  ('b1000001-0000-4000-8000-000000000008', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Grand Ballroom',                    'BANQUET',    'Events, weddings & conferences',                   '3rd Floor',        NULL,       TRUE,  TRUE, TRUE);

-- ── Dummy data — room_charges (running folios) ────────────────
-- Room 101 (Anjali Singh) has an open folio; some pending, some settled.
INSERT INTO room_charges (id, hotel_id, room_number, outlet_id, amount, description, status, guest_name, payment_choice, created_at, settled_at) VALUES
  ('c1000001-0000-4000-8000-000000000001', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'b1000001-0000-4000-8000-000000000001', 780.00,  'Zodiac Restaurant — Dinner for 2',            'PENDING', 'Anjali Singh', 'CHARGE_TO_ROOM', NOW() - INTERVAL '3 hours',  NULL),
  ('c1000001-0000-4000-8000-000000000002', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'b1000001-0000-4000-8000-000000000002', 1250.00, 'The Cellar Bar — Cocktails',                  'PENDING', 'Anjali Singh', 'CHARGE_TO_ROOM', NOW() - INTERVAL '2 hours',  NULL),
  ('c1000001-0000-4000-8000-000000000003', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'b1000001-0000-4000-8000-000000000004', 450.00,  'Poolside Grill — Snacks & juice',             'PENDING', 'Anjali Singh', 'CHARGE_TO_ROOM', NOW() - INTERVAL '1 hour',   NULL),
  -- Room 201 (Ravi Kumar) — one settled, one direct-paid
  ('c1000001-0000-4000-8000-000000000004', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'b1000001-0000-4000-8000-000000000003', 2500.00, 'Serenity Spa — Swedish Massage 60min',        'SETTLED', 'Ravi Kumar',   'CHARGE_TO_ROOM', NOW() - INTERVAL '1 day',    NOW() - INTERVAL '20 hours'),
  ('c1000001-0000-4000-8000-000000000005', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'b1000001-0000-4000-8000-000000000005', 320.00,  'Palace Boutique — Toiletries',                'SETTLED', 'Ravi Kumar',   'PAY_DIRECT',     NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '5 hours'),
  -- Room 301 (Meena Pillai) — single pending F&B charge
  ('c1000001-0000-4000-8000-000000000006', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '301', 'b1000001-0000-4000-8000-000000000001', 1680.00, 'Zodiac Restaurant — Lunch buffet x3',         'PENDING', 'Meena Pillai', 'CHARGE_TO_ROOM', NOW() - INTERVAL '6 hours',  NULL);

-- ── Dummy data — guest_service_requests (QR-raised) ───────────
INSERT INTO guest_service_requests (id, hotel_id, room_number, guest_name, type, details, priority, status, created_at, completed_at) VALUES
  ('d1000001-0000-4000-8000-000000000001', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'Anjali Singh', 'AMENITIES',    '2 extra bath towels and a toothbrush',            'NORMAL', 'NEW',      NOW() - INTERVAL '8 min',   NULL),
  ('d1000001-0000-4000-8000-000000000002', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'Ravi Kumar',   'HOUSEKEEPING', 'Please make up the room while we are at breakfast','NORMAL', 'ACCEPTED', NOW() - INTERVAL '25 min',  NULL),
  ('d1000001-0000-4000-8000-000000000003', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '301', 'Meena Pillai', 'MAINTENANCE',  'Bathroom sink draining slowly',                    'HIGH',   'NEW',      NOW() - INTERVAL '15 min',  NULL),
  ('d1000001-0000-4000-8000-000000000004', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '101', 'Anjali Singh', 'CONCIERGE',    'Book an airport cab for tomorrow 6 AM',            'NORMAL', 'ACCEPTED', NOW() - INTERVAL '40 min',  NULL),
  ('d1000001-0000-4000-8000-000000000005', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '201', 'Ravi Kumar',   'LAUNDRY',      'Express laundry — 2 shirts, 1 trouser',            'NORMAL', 'DONE',     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '90 min'),
  ('d1000001-0000-4000-8000-000000000006', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '301', 'Meena Pillai', 'LATE_CHECKOUT','Requesting checkout at 3 PM instead of noon',      'NORMAL', 'DONE',     NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours');

-- ── Dummy data — outlet_bookings (spa / activities) ───────────
INSERT INTO outlet_bookings (id, hotel_id, outlet_id, outlet_name, room_number, guest_name, guest_phone, service_name, price, booking_date, booking_time, party_size, notes, status, payment_choice, created_at, confirmed_at) VALUES
  ('e1000001-0000-4000-8000-000000000001', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'b1000001-0000-4000-8000-000000000003', 'Serenity Spa',                 '101', 'Anjali Singh', '9845012345', 'Aromatherapy Massage 90min',   3500.00, 'Jun 16, 2026', '16:00', 1, 'Prefers lavender oil',        'CONFIRMED', 'CHARGE_TO_ROOM', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 min'),
  ('e1000001-0000-4000-8000-000000000002', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'b1000001-0000-4000-8000-000000000007', 'Heritage Walk & City Tours',   '301', 'Meena Pillai', '9845067890', 'Old City Heritage Walk',       1200.00, 'Jun 17, 2026', '07:30', 2, 'Vegetarian breakfast en route','REQUESTED', 'CHARGE_TO_ROOM', NOW() - INTERVAL '50 min',  NULL),
  ('e1000001-0000-4000-8000-000000000003', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'b1000001-0000-4000-8000-000000000001', 'Zodiac — Restaurant',          '201', 'Ravi Kumar',   '9845054321', 'Dinner table for 4',           0.00,    'Jun 16, 2026', '20:30', 4, 'Window table if possible',    'CONFIRMED', 'PAY_DIRECT',     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours');

-- ── hotel_access (hotel-wide / outlet-scoped staff roles) ─────
-- Table created explicitly (same reasoning as hotel_outlets above): required
-- by every hasAccess() check in hotel-service, so it must exist even before
-- hotel-service's own ddl-auto=update run creates it.
CREATE TABLE IF NOT EXISTS hotel_access (
    id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id    UUID          NOT NULL,
    user_id     VARCHAR(255)  NOT NULL,
    role        VARCHAR(30)   DEFAULT 'STAFF' CHECK (role IN ('OWNER','GENERAL_MANAGER','OUTLET_MANAGER','STAFF')),
    outlet_id   UUID,
    created_at  TIMESTAMP     DEFAULT NOW(),
    UNIQUE (hotel_id, user_id, outlet_id)
);
CREATE INDEX IF NOT EXISTS idx_hotel_access_hotel ON hotel_access (hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_access_user  ON hotel_access (user_id);

-- ── Dummy data — hotel_access ──────────────────────────────────
-- OWNER row per seeded hotel so gm@grandpalace.in can manage all 3 properties.
-- Plus one OUTLET_MANAGER example scoped to a single outlet (Serenity Spa).
INSERT INTO hotel_access (id, hotel_id, user_id, role, outlet_id) VALUES
  ('f1000001-0000-4000-8000-000000000001', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', 'OWNER',           NULL),
  ('f1000001-0000-4000-8000-000000000002', '0a035141-82b3-4e32-ae79-024ff06dba3f', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', 'OWNER',           NULL),
  ('f1000001-0000-4000-8000-000000000003', '2673d4b8-7f7c-4c61-8df9-2f775d482873', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', 'OWNER',           NULL),
  ('f1000001-0000-4000-8000-000000000004', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', '43ff4c07-a85e-4ec0-be79-9cd05b78f94a', 'OUTLET_MANAGER',  'b1000001-0000-4000-8000-000000000003');


-- ============================================================
--  SECTION 9 — aviqr_mall
-- ============================================================
\connect "dbname=aviqr_mall host=localhost user=aviqr password=aviqr_secret"

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
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    mall_id    UUID         NOT NULL,
    name       VARCHAR(255) NOT NULL,
    category   VARCHAR(100),
    floor      VARCHAR(50),
    contact    VARCHAR(20),
    shop_id    VARCHAR(100),
    active     BOOLEAN      DEFAULT TRUE,
    qr_active  BOOLEAN      DEFAULT TRUE,
    -- PENDING = mall admin sent a link request, awaiting the restaurant owner's decision
    -- (Restaurant Request Flow). ACTIVE vendors feed the mall dashboard, reports, and the
    -- public food-court restaurant list (Food Court QR Flow). REJECTED is never shown.
    status     VARCHAR(20)  DEFAULT 'ACTIVE' CHECK (status IN ('PENDING','ACTIVE','REJECTED')),
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_vendors_mall_id ON vendors (mall_id);
CREATE INDEX idx_vendors_active  ON vendors (active);
CREATE INDEX idx_vendors_floor   ON vendors (floor);

CREATE SEQUENCE seq_vendor_ref START 1001 INCREMENT 1;

-- ── Dummy data ────────────────────────────────────────────────
-- created_at is staggered explicitly (not left to NOW() on a shared multi-row
-- INSERT, which would tie all three) so mall-service's findByAdminIdOrderByCreatedAtAsc
-- deterministically surfaces Forum Mall Bengaluru — the one with a full vendor
-- roster and a real shop-linked vendor — as this admin's default/first mall.
INSERT INTO malls (id, name, admin_id, city, address, phone, email, commission_percent, subscription_plan, active, created_at) VALUES
  ('f35f1a27-5632-43fe-aa8d-1db992097e4e', 'Forum Mall Bengaluru',  'e3e551fa-0ede-4317-b7b1-015648bcdb94', 'Bengaluru', 'Hosur Road, Koramangala', '08041234567', 'admin@forummall.in',   10.00, 'MALL_PRO',     TRUE, NOW() - INTERVAL '2 minutes'),
  ('c81747a6-c29f-422b-a241-ba50883cf76a', 'Phoenix Market City',   'e3e551fa-0ede-4317-b7b1-015648bcdb94', 'Mumbai',    'LBS Marg, Kurla',         '02261234567', 'admin@phoenixmc.in',  10.00, 'ENTERPRISE',   TRUE, NOW() - INTERVAL '1 minute'),
  ('4c22330a-7173-4937-bfd1-1499a24effc9', 'Elante Mall',           'e3e551fa-0ede-4317-b7b1-015648bcdb94', 'Chandigarh','Industrial Area Phase I',  '01726543210', 'admin@elante.in',     12.00, 'MALL_BASIC',   TRUE, NOW());

INSERT INTO vendors (id, mall_id, name, category, floor, contact, shop_id, active, qr_active, status) VALUES
  ('6efd1a31-ee35-447e-a2d2-d533ddbe272b', 'f35f1a27-5632-43fe-aa8d-1db992097e4e', 'Spice Route',       'North Indian',  'F1', '9845012345', 'ecdbc557-91fa-44ee-992f-03683ad8bbde', TRUE,  TRUE, 'ACTIVE'),
  ('118c94a4-2206-4f79-84db-2643a9a4c77b', 'f35f1a27-5632-43fe-aa8d-1db992097e4e', 'Wok to Walk',       'Chinese',       'F1', '9876501234', NULL,                                   TRUE,  TRUE, 'ACTIVE'),
  ('690bcf93-ff91-45c6-92f8-b660284fef21', 'f35f1a27-5632-43fe-aa8d-1db992097e4e', 'Burger Republic',   'Fast Food',     'F2', '9112345678', NULL,                                   TRUE,  TRUE, 'ACTIVE'),
  ('d4020098-51cb-4c23-8681-3c17021463a3', 'f35f1a27-5632-43fe-aa8d-1db992097e4e', 'Rolls Corner',      'Kathi Rolls',   'F1', '9988000001', NULL,                                   FALSE, FALSE, 'ACTIVE'),
  ('40d28351-2022-402c-874d-2e878870e398', 'f35f1a27-5632-43fe-aa8d-1db992097e4e', 'Ice Cream Palace',  'Desserts',      'F2', '9000112233', NULL,                                   TRUE,  TRUE, 'ACTIVE'),
  ('bcd4e6e6-a0c8-47fa-aae2-1eba1b9b413c', 'f35f1a27-5632-43fe-aa8d-1db992097e4e', 'South Spice',       'South Indian',  'F2', '9876509876', NULL,                                   TRUE,  TRUE, 'ACTIVE'),
  ('137d55e4-6ed9-46e7-8e53-a8ded4333577', 'c81747a6-c29f-422b-a241-ba50883cf76a', 'Biryani Blues',     'Biryani',       'GF', '9900112244', NULL,                                   TRUE,  TRUE, 'ACTIVE'),
  ('04156897-4daf-49e7-a7a3-17eb8dbd50f1', 'c81747a6-c29f-422b-a241-ba50883cf76a', 'Pizza Express',     'Italian',       'FF', '9900223355', NULL,                                   TRUE,  TRUE, 'ACTIVE'),
  ('afaccb1f-4417-41fc-a7d8-05acc9e0a018', 'c81747a6-c29f-422b-a241-ba50883cf76a', 'Chaat Central',     'Street Food',   'GF', '9900334466', NULL,                                   TRUE,  TRUE, 'ACTIVE');


-- ============================================================
--  SECTION 10 — aviqr_support
-- ============================================================
\connect "dbname=aviqr_support host=localhost user=aviqr password=aviqr_secret"

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
  ('7fc0e791-f0d9-44da-9de5-61ba8d280d1d', 'TKT-10001', '6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', 'Sujeet Narayanan', 'OWNER',    'QR code not scanning on Android phones',                 'Customers with older Android devices report the QR redirects to a blank page.',         'HIGH',   'OPEN',     'd4eaf7a7-6cce-41eb-916c-6d52336107be', NOW() - INTERVAL '2 hours',   NOW() - INTERVAL '1 hour',    NULL),
  ('279dd266-f59d-4202-bb03-c7ee90246714', 'TKT-10002', '3580a702-e960-4a40-83eb-a596c88595f7', 'Meena Pillai',    'OWNER',    'Payment stuck in PENDING for 2 hours',                   'Order ORD-1003 payment shows pending but amount was deducted from customer account.',   'URGENT', 'PENDING',  'd4eaf7a7-6cce-41eb-916c-6d52336107be', NOW() - INTERVAL '3 hours',   NOW() - INTERVAL '30 min',    NULL),
  ('61200d51-d498-4586-9d12-af0992c54682', 'TKT-10003', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', 'Grand Palace Hotel','HOTEL',  'Room service menu not loading for hotel guests',         'Guests scanning room QR code see an empty menu page. Items added but not reflecting.',  'HIGH',   'OPEN',     NULL,                                   NOW() - INTERVAL '5 hours',   NOW() - INTERVAL '5 hours',   NULL),
  ('2680977a-919e-4635-8726-95cf20795dc6', 'TKT-10004', '6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', 'Sujeet Narayanan', 'OWNER',   'How to bulk upload menu via Excel?',                     'Looking for documentation on uploading menu items in bulk without scanning each one.',  'LOW',    'RESOLVED', 'd4eaf7a7-6cce-41eb-916c-6d52336107be', NOW() - INTERVAL '1 day',     NOW() - INTERVAL '20 hours',  NOW() - INTERVAL '20 hours'),
  ('7c04cf19-cd9b-486c-bd60-c06568cd0d99', 'TKT-10005', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',    'CUSTOMER', 'Order placed but restaurant says they did not receive it','I placed order ORD-1001 at Spice Route, paid online, but the restaurant had no record.','HIGH',   'RESOLVED', 'd4eaf7a7-6cce-41eb-916c-6d52336107be', NOW() - INTERVAL '2 days',    NOW() - INTERVAL '1 day',     NOW() - INTERVAL '1 day'),
  ('98c6689e-a5e8-4ab0-88ae-8f3331fb9a7e', 'TKT-10006', 'e3e551fa-0ede-4317-b7b1-015648bcdb94', 'Forum Mall Admin', 'MALL',   'Commission report shows wrong percentage',               'Monthly commission report shows 12% instead of the agreed 10% rate.',                   'MEDIUM', 'OPEN',     NULL,                                   NOW() - INTERVAL '6 hours',   NOW() - INTERVAL '6 hours',   NULL),
  ('3c94d23f-a115-4070-881f-f5f25c26564f', 'TKT-10007', 'd7ad7958-b4dc-4b94-8a8f-f4cfe39f0179', 'Farhan Khan',     'OWNER',   'Account suspended without notice',                       'My account was suspended. I have not violated any terms. Please review and reinstate.',  'URGENT', 'PENDING',  'd4eaf7a7-6cce-41eb-916c-6d52336107be', NOW() - INTERVAL '4 hours',   NOW() - INTERVAL '2 hours',   NULL);

INSERT INTO support_tickets (id, ticket_number, user_id, user_name, user_role, subject, description, priority, status, resolution, created_at, updated_at, resolved_at) VALUES
  ('9963aac9-6639-4c9c-b2dc-3e195a968e0f', 'TKT-10008', '6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', 'Sujeet Narayanan', 'OWNER', 'OCR menu scan misread item prices',
   'Uploaded a photo of my physical menu. The AI extracted most items correctly but some prices show wrong values.',
   'MEDIUM', 'RESOLVED',
   'Improved OCR confidence threshold. Please re-upload the menu photo and approve the extracted items.',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

INSERT INTO impersonation_logs (id, agent_id, agent_name, target_user_id, target_user_name, reason, created_at, ended_at) VALUES
  (gen_random_uuid(), 'd4eaf7a7-6cce-41eb-916c-6d52336107be', 'Arjun Nair', '6dbae4cc-5e11-48c1-a3cb-4baae5f344aa', 'Sujeet Narayanan', 'Investigating TKT-10001 — QR scanning issue on Android', NOW() - INTERVAL '1 hour',  NOW() - INTERVAL '45 min'),
  (gen_random_uuid(), 'd4eaf7a7-6cce-41eb-916c-6d52336107be', 'Arjun Nair', '3580a702-e960-4a40-83eb-a596c88595f7', 'Meena Pillai',     'Investigating TKT-10002 — payment stuck PENDING',         NOW() - INTERVAL '30 min', NULL);


-- ============================================================
--  SECTION 11 — aviqr_review
-- ============================================================
\connect "dbname=aviqr_review host=localhost user=aviqr password=aviqr_secret"

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── reviews ───────────────────────────────────────────────────
CREATE TABLE reviews (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id       VARCHAR(100) NOT NULL,
    menu_item_id  UUID,
    order_id      UUID,
    customer_id   VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    rating        SMALLINT     NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment       TEXT,
    created_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX idx_reviews_shop_id      ON reviews (shop_id);
CREATE INDEX idx_reviews_customer_id  ON reviews (customer_id);
CREATE INDEX idx_reviews_menu_item_id ON reviews (menu_item_id);
CREATE INDEX idx_reviews_created_at   ON reviews (created_at DESC);

-- Dummy data — 3+ reviews for SHOP_101 required by tests
INSERT INTO reviews (id, shop_id, menu_item_id, customer_id, customer_name, rating, comment, created_at) VALUES
  -- Spice Route (SHOP_101) — at least 3 hand-written reviews
  (gen_random_uuid(), 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '5c7d3851-2f4b-4210-ae98-4af28258fab9', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',  5, 'Best Paneer Butter Masala in the area!',        NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '692fca3e-4f99-4a16-98d4-96affdfaa29a', '223f40ff-4020-4baf-8d8e-44e347263bd1', 'Ravi Kumar',    5, 'Butter chicken was perfect, will order again.', NOW() - INTERVAL '8 days'),
  (gen_random_uuid(), 'ecdbc557-91fa-44ee-992f-03683ad8bbde', NULL,                                   'f4512249-1a01-4be8-bf08-93e312202827', 'Sara Thomas',   4, 'Great food, delivery took a bit long.',         NOW() - INTERVAL '9 days'),
  (gen_random_uuid(), 'ecdbc557-91fa-44ee-992f-03683ad8bbde', 'a9ab05b0-202c-4188-a0de-1ac8fb85f91b', '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',  4, 'Paneer Tikka perfectly grilled, loved it!',     NOW() - INTERVAL '10 days'),
  (gen_random_uuid(), 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '8961dab4-323d-45cf-b7f6-f6e1dc1086c7', '223f40ff-4020-4baf-8d8e-44e347263bd1', 'Ravi Kumar',    5, 'Chicken Biryani is absolutely divine.',         NOW() - INTERVAL '11 days'),
  (gen_random_uuid(), 'ecdbc557-91fa-44ee-992f-03683ad8bbde', '40b195f0-633a-42ac-86ef-f06b87d62934', 'f4512249-1a01-4be8-bf08-93e312202827', 'Sara Thomas',   5, 'Dal Makhani tasted just like home. Amazing!',   NOW() - INTERVAL '12 days'),
  -- The Coconut Grove (SHOP_102)
  (gen_random_uuid(), '44aeca17-767e-410b-868f-9fdd593fa091', NULL,                                   '24e349fe-42b8-4ac1-b202-99261aac3165', 'Anjali Singh',  4, 'Loved the Kerala fish curry.',                  NOW() - INTERVAL '7 days'),
  (gen_random_uuid(), '44aeca17-767e-410b-868f-9fdd593fa091', 'f2d406f1-6dd9-4a5c-940b-40b87921983a', '223f40ff-4020-4baf-8d8e-44e347263bd1', 'Ravi Kumar',    5, 'Prawn Koliwada is a must try!',                 NOW() - INTERVAL '5 days'),
  -- Biryani House (SHOP_103)
  (gen_random_uuid(), 'e8754df0-7965-400a-8923-35543d8a698b', NULL,                                   '223f40ff-4020-4baf-8d8e-44e347263bd1', 'Ravi Kumar',    3, 'Good biryani but service was slow.',            NOW() - INTERVAL '10 days');

GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;


-- ============================================================
--  SECTION 12 — (removed)
--  Bulk-generated anonymous data replaced by per-user-type
--  hand-written records above. Each login has its own linked data.
-- ============================================================


-- ============================================================
--  SECTION 13 — FINAL GRANTS
-- ============================================================
\connect "dbname=aviqr_auth host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_shop host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_menu host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_order host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_payment host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_qr host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_hotel host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_mall host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_support host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_report host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;

\connect "dbname=aviqr_review host=localhost user=aviqr password=aviqr_secret"
GRANT ALL ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO aviqr;


-- ============================================================
--  SECTION 14 — QUICK VERIFICATION QUERIES
-- ============================================================
-- Run these after setup to verify row counts:
--
-- \connect aviqr_auth aviqr
-- SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY role;
--
-- \connect aviqr_shop
-- SELECT name, subscription_plan, status FROM shops;
--
-- \connect aviqr_menu
-- SELECT COUNT(*) AS items, shop_id FROM menu_items GROUP BY shop_id;
--
-- \connect aviqr_order
-- SELECT status, COUNT(*) FROM orders GROUP BY status;
--
-- \connect aviqr_payment
-- SELECT status, COUNT(*), SUM(amount) FROM payments GROUP BY status;
--
-- \connect aviqr_qr
-- SELECT qr_code, label, scan_count FROM qr_codes ORDER BY scan_count DESC;
--
-- \connect aviqr_hotel
-- SELECT status, COUNT(*) FROM rooms GROUP BY status;
-- SELECT h.name, ha.user_id, ha.role, ha.outlet_id FROM hotel_access ha JOIN hotels h ON h.id=ha.hotel_id;
--
-- \connect aviqr_mall
-- SELECT m.name, COUNT(v.id) AS vendors FROM malls m LEFT JOIN vendors v ON v.mall_id=m.id GROUP BY m.name;
--
-- \connect aviqr_support
-- SELECT status, priority, COUNT(*) FROM support_tickets GROUP BY status, priority ORDER BY status;
--
-- \connect aviqr_review
-- SELECT shop_id, COUNT(*) AS reviews, ROUND(AVG(rating),2) AS avg_rating FROM reviews GROUP BY shop_id;


-- ============================================================
--  SECTION 15 — New Tables: Variants, Add-ons, Raw Materials, Recipes
--  Added in v2.1 for POS billing, recipes, and food cost tracking
-- ============================================================

\c aviqr_menu;

-- Rich media columns (run on existing DBs)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS video_url   VARCHAR(1000);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS model_url   VARCHAR(1000);
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS media_type  VARCHAR(20) DEFAULT 'NONE';

-- Menu Variants (S/M/L, Half/Full, etc.)
CREATE TABLE IF NOT EXISTS menu_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id    UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    variant_name    VARCHAR(80) NOT NULL,
    price           NUMERIC(10,2) NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    sort_order      INTEGER DEFAULT 0,
    active          BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_menu_variants_item ON menu_variants(menu_item_id);

-- Menu Add-ons (extra cheese, extra sauce, etc.)
CREATE TABLE IF NOT EXISTS menu_addons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id     VARCHAR(100) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    veg         BOOLEAN DEFAULT TRUE,
    active      BOOLEAN DEFAULT TRUE,
    sort_order  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_menu_addons_shop ON menu_addons(shop_id);

-- Raw Materials / Ingredients
CREATE TABLE IF NOT EXISTS raw_materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id         VARCHAR(100) NOT NULL,
    name            VARCHAR(150) NOT NULL,
    unit            VARCHAR(30)  NOT NULL,  -- kg, litre, piece, gram, ml
    current_stock   NUMERIC(10,3) DEFAULT 0,
    min_stock_level NUMERIC(10,3) DEFAULT 0,
    cost_per_unit   NUMERIC(12,2) DEFAULT 0,
    supplier        VARCHAR(200),
    active          BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_raw_materials_shop ON raw_materials(shop_id);

-- Recipe (ingredients per menu item)
CREATE TABLE IF NOT EXISTS recipe_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id      UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    raw_material_id   UUID NOT NULL REFERENCES raw_materials(id),
    raw_material_name VARCHAR(150),
    quantity          NUMERIC(10,3) NOT NULL,
    unit              VARCHAR(30),
    cost_contribution NUMERIC(10,2)
);
CREATE INDEX IF NOT EXISTS idx_recipe_items_menu_item ON recipe_items(menu_item_id);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aviqr;


-- ============================================================
--  SECTION 16 — v2.2 schema additions
--  Add aggregator_source to orders for Zomato/Swiggy tracking
-- ============================================================

\c aviqr_order;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS aggregator_source VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS aggregator_order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_aggregator ON orders(aggregator_source)
  WHERE aggregator_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_shop_date ON orders(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_item ON order_items(menu_item_id);

-- Report-friendly view: daily revenue per shop
CREATE OR REPLACE VIEW daily_shop_revenue AS
SELECT
  shop_id,
  DATE(created_at)               AS order_date,
  COUNT(*)                        AS total_orders,
  SUM(total_amount)              AS total_revenue,
  AVG(total_amount)              AS avg_order_value,
  COUNT(*) FILTER (WHERE type = 'DINE_IN')  AS dine_in_count,
  COUNT(*) FILTER (WHERE type = 'TAKEAWAY') AS takeaway_count,
  COUNT(*) FILTER (WHERE type = 'DELIVERY') AS delivery_count
FROM orders
WHERE status NOT IN ('CANCELLED', 'REJECTED')
GROUP BY shop_id, DATE(created_at);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT SELECT ON daily_shop_revenue TO aviqr;


-- ============================================================
--  SECTION 17 — KOT Demo: Live active orders for kitchen display
--  These orders are in NEW / ACCEPTED / PREPARING / READY states
--  so the KOT Dashboard has real data to display on first run.
-- ============================================================

\c aviqr_order;

-- ── Today's active orders for Spice Route (shop 101) ─────────────────────────

INSERT INTO orders (id, order_number, shop_id, customer_name, customer_phone, table_number, type, status,
                    payment_method, payment_status, payment_id, subtotal, tax, total_amount, notes,
                    created_at, accepted_at, completed_at)
VALUES
  -- NEW — just arrived, needs acceptance
  ('7a507852-145c-4432-80e6-fd04895426ad', 'ORD-K001', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Priya Sharma',   '9876543211', '3',  'DINE_IN',  'NEW',
   'ONLINE', 'PAID', 'pay_K001', 640.00, 32.00, 672.00, 'No onion no garlic please',
   NOW() - INTERVAL '3 min',  NULL, NULL),

  ('04383cdd-14e4-42e2-a45a-ecdfb42517dd', 'ORD-K002', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Walk-in',        NULL,         NULL, 'TAKEAWAY', 'NEW',
   'CASH', 'PENDING', NULL, 280.00, 14.00, 294.00, NULL,
   NOW() - INTERVAL '6 min',  NULL, NULL),

  ('53fe53eb-ef9c-405d-981c-f893825e06a6', 'ORD-K003', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Rahul Gupta',    '9911223344', '8',  'DINE_IN',  'NEW',
   'ONLINE', 'PAID', 'pay_K003', 860.00, 43.00, 903.00, NULL,
   NOW() - INTERVAL '2 min',  NULL, NULL),

  -- ACCEPTED — being cooked
  ('f56b63f2-b92d-43d3-aa1f-6e44bbeac52b', 'ORD-K004', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Kavitha Nair',   '9822334455', '5',  'DINE_IN',  'ACCEPTED',
   'ONLINE', 'PAID', 'pay_K004', 560.00, 28.00, 588.00, 'Extra spicy',
   NOW() - INTERVAL '18 min', NOW() - INTERVAL '14 min', NULL),

  ('3db703dc-5bd3-4e8b-a108-e734aabe1338', 'ORD-K005', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Arjun Mehta',    '9900112233', NULL, 'TAKEAWAY', 'ACCEPTED',
   'UPI',  'PAID', 'pay_K005', 380.00, 19.00, 399.00, NULL,
   NOW() - INTERVAL '22 min', NOW() - INTERVAL '18 min', NULL),

  -- PREPARING — finishing touches
  ('44e8826d-0c17-4842-9baa-3ff4810c1483', 'ORD-K006', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Sunita Verma',   '9988007766', '1',  'DINE_IN',  'PREPARING',
   'CASH', 'PENDING', NULL, 720.00, 36.00, 756.00, NULL,
   NOW() - INTERVAL '28 min', NOW() - INTERVAL '24 min', NULL),

  ('461d094f-9f54-4b0d-8870-077fed677b27', 'ORD-K007', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Rajan Pillai',   '9833445566', '11', 'DINE_IN',  'PREPARING',
   'ONLINE', 'PAID', 'pay_K007', 480.00, 24.00, 504.00, 'Less oil',
   NOW() - INTERVAL '35 min', NOW() - INTERVAL '30 min', NULL),

  -- READY — plated and ready to serve
  ('8b6d0bee-2372-41f2-9c15-3864bfab19bd', 'ORD-K008', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Deepa Iyer',     '9711223344', '6',  'DINE_IN',  'READY',
   'ONLINE', 'PAID', 'pay_K008', 440.00, 22.00, 462.00, NULL,
   NOW() - INTERVAL '40 min', NOW() - INTERVAL '35 min', NULL),

  ('6b9e5a43-febc-459b-8651-4a2da0786c7d', 'ORD-K009', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Walk-in',        NULL,         NULL, 'TAKEAWAY', 'READY',
   'CASH', 'PENDING', NULL, 160.00,  8.00, 168.00, NULL,
   NOW() - INTERVAL '32 min', NOW() - INTERVAL '28 min', NULL),

  -- Delivery — NEW from Zomato
  ('42e3a909-54b9-4319-9462-3a6f06af4e95', 'ORD-K010', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Zomato Order',   NULL,         NULL, 'DELIVERY', 'NEW',
   'ONLINE', 'PAID', 'pay_Z001', 680.00, 34.00, 714.00, 'Contactless delivery',
   NOW() - INTERVAL '4 min',  NULL, NULL),

  -- ACCEPTED delivery
  ('7050d685-ffad-452d-9c63-cc80575f81db', 'ORD-K011', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Swiggy Order',   NULL,         NULL, 'DELIVERY', 'ACCEPTED',
   'ONLINE', 'PAID', 'pay_S001', 520.00, 26.00, 546.00, 'No garlic',
   NOW() - INTERVAL '25 min', NOW() - INTERVAL '20 min', NULL),

  -- Some completed orders for reports (today)
  ('e9fc807a-1cff-4854-9183-f70334cc1803', 'ORD-K020', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Neha Kapoor',    '9812223334', '2',  'DINE_IN',  'COMPLETED',
   'ONLINE', 'PAID', 'pay_K020', 880.00, 44.00, 924.00, NULL,
   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '55 min', NOW() - INTERVAL '35 min'),

  ('d4ea0227-1fb1-4153-a178-4fcc1ba181c8', 'ORD-K021', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Vijay Kumar',    '9900334455', '7',  'DINE_IN',  'COMPLETED',
   'CASH', 'CASH', NULL, 460.00, 23.00, 483.00, NULL,
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '115 min', NOW() - INTERVAL '95 min'),

  ('f85912ae-7d8e-4c42-8c40-517d2127fbbb', 'ORD-K022', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Meera Bose',     '9711334455', NULL, 'TAKEAWAY', 'COMPLETED',
   'UPI', 'PAID', 'pay_K022', 340.00, 17.00, 357.00, NULL,
   NOW() - INTERVAL '90 min', NOW() - INTERVAL '86 min', NOW() - INTERVAL '72 min'),

  ('1004b85a-b72c-4f92-bdd3-e55927b1ad3b', 'ORD-K023', 'ecdbc557-91fa-44ee-992f-03683ad8bbde',
   'Arun Desai',     '9833556677', '4',  'DINE_IN',  'COMPLETED',
   'CARD', 'PAID', 'pay_K023', 1200.00, 60.00, 1260.00, NULL,
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '175 min', NOW() - INTERVAL '150 min')
ON CONFLICT (order_number) DO NOTHING;

-- ── Order items for KOT demo orders ──────────────────────────────────────────

INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price, notes)
VALUES
  -- K001: Priya Sharma, Table 3
  (gen_random_uuid(), '7a507852-145c-4432-80e6-fd04895426ad', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala', 2, 320.00, 640.00, NULL),

  -- K002: Takeaway walk-in
  (gen_random_uuid(), '04383cdd-14e4-42e2-a45a-ecdfb42517dd', 'a9ab05b0-202c-4188-a0de-1ac8fb85f91b', 'Paneer Tikka',          1, 280.00, 280.00, NULL),

  -- K003: Rahul, Table 8
  (gen_random_uuid(), '53fe53eb-ef9c-405d-981c-f893825e06a6', '692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',        1, 380.00, 380.00, NULL),
  (gen_random_uuid(), '53fe53eb-ef9c-405d-981c-f893825e06a6', '40b195f0-633a-42ac-86ef-f06b87d62934', 'Dal Makhani',           1, 280.00, 280.00, NULL),
  (gen_random_uuid(), '53fe53eb-ef9c-405d-981c-f893825e06a6', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',           4,  55.00, 220.00, NULL),

  -- K004: Kavitha, Table 5
  (gen_random_uuid(), 'f56b63f2-b92d-43d3-aa1f-6e44bbeac52b', 'bbcba77a-d3dc-4497-a151-cc04e6bec540', 'Chicken Kadai',         1, 360.00, 360.00, 'Extra spicy'),
  (gen_random_uuid(), 'f56b63f2-b92d-43d3-aa1f-6e44bbeac52b', '21d56a25-8a99-4f72-ae5c-5fbd4818adc8', 'Garlic Naan',           3,  65.00, 195.00, NULL),

  -- K005: Arjun takeaway
  (gen_random_uuid(), '3db703dc-5bd3-4e8b-a108-e734aabe1338', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala',  1, 320.00, 320.00, NULL),
  (gen_random_uuid(), '3db703dc-5bd3-4e8b-a108-e734aabe1338', '4b7f99f0-87f2-4775-a156-540ebaa6b8fa', 'Tandoori Roti',         2,  40.00,  80.00, NULL),

  -- K006: Sunita, Table 1
  (gen_random_uuid(), '44e8826d-0c17-4842-9baa-3ff4810c1483', '8961dab4-323d-45cf-b7f6-f6e1dc1086c7', 'Chicken Biryani',       2, 360.00, 720.00, NULL),

  -- K007: Rajan, Table 11
  (gen_random_uuid(), '461d094f-9f54-4b0d-8870-077fed677b27', '40b195f0-633a-42ac-86ef-f06b87d62934', 'Dal Makhani',           1, 280.00, 280.00, 'Less oil'),
  (gen_random_uuid(), '461d094f-9f54-4b0d-8870-077fed677b27', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',           2,  55.00, 110.00, NULL),
  (gen_random_uuid(), '461d094f-9f54-4b0d-8870-077fed677b27', 'ab52d364-8302-4122-b708-2629638349f0', 'Sweet Lassi',           1,  80.00,  80.00, NULL),

  -- K008: Deepa, Table 6 (READY)
  (gen_random_uuid(), '8b6d0bee-2372-41f2-9c15-3864bfab19bd', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala',  1, 320.00, 320.00, NULL),
  (gen_random_uuid(), '8b6d0bee-2372-41f2-9c15-3864bfab19bd', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',           2,  55.00, 110.00, NULL),

  -- K009: Walk-in takeaway (READY)
  (gen_random_uuid(), '6b9e5a43-febc-459b-8651-4a2da0786c7d', '9bde5fa9-5627-4154-9d49-360b5948bf20', 'Masala Chai',           2,  40.00,  80.00, NULL),
  (gen_random_uuid(), '6b9e5a43-febc-459b-8651-4a2da0786c7d', 'f7b34ab7-f703-4e71-9705-f131d55ebafe', 'Gulab Jamun (2 pcs)',   1,  90.00,  90.00, NULL),

  -- K010: Zomato delivery (NEW)
  (gen_random_uuid(), '42e3a909-54b9-4319-9462-3a6f06af4e95', '692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',        1, 380.00, 380.00, NULL),
  (gen_random_uuid(), '42e3a909-54b9-4319-9462-3a6f06af4e95', '8961dab4-323d-45cf-b7f6-f6e1dc1086c7', 'Chicken Biryani',       1, 360.00, 360.00, NULL),

  -- K011: Swiggy delivery (ACCEPTED)
  (gen_random_uuid(), '7050d685-ffad-452d-9c63-cc80575f81db', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala',  1, 320.00, 320.00, 'No garlic'),
  (gen_random_uuid(), '7050d685-ffad-452d-9c63-cc80575f81db', 'a9ab05b0-202c-4188-a0de-1ac8fb85f91b', 'Paneer Tikka',          1, 280.00, 280.00, NULL),

  -- K020: Neha (COMPLETED — for reports)
  (gen_random_uuid(), 'e9fc807a-1cff-4854-9183-f70334cc1803', '692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',        2, 380.00, 760.00, NULL),
  (gen_random_uuid(), 'e9fc807a-1cff-4854-9183-f70334cc1803', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',           4,  55.00, 220.00, NULL),

  -- K021: Vijay (COMPLETED)
  (gen_random_uuid(), 'd4ea0227-1fb1-4153-a178-4fcc1ba181c8', '40b195f0-633a-42ac-86ef-f06b87d62934', 'Dal Makhani',           1, 280.00, 280.00, NULL),
  (gen_random_uuid(), 'd4ea0227-1fb1-4153-a178-4fcc1ba181c8', '21d56a25-8a99-4f72-ae5c-5fbd4818adc8', 'Garlic Naan',           3,  65.00, 195.00, NULL),

  -- K022: Meera takeaway (COMPLETED)
  (gen_random_uuid(), 'f85912ae-7d8e-4c42-8c40-517d2127fbbb', 'a9ab05b0-202c-4188-a0de-1ac8fb85f91b', 'Paneer Tikka',          1, 280.00, 280.00, NULL),
  (gen_random_uuid(), 'f85912ae-7d8e-4c42-8c40-517d2127fbbb', '9bde5fa9-5627-4154-9d49-360b5948bf20', 'Masala Chai',           2,  40.00,  80.00, NULL),

  -- K023: Arun large family order (COMPLETED)
  (gen_random_uuid(), '1004b85a-b72c-4f92-bdd3-e55927b1ad3b', '692fca3e-4f99-4a16-98d4-96affdfaa29a', 'Butter Chicken',        2, 380.00,  760.00, NULL),
  (gen_random_uuid(), '1004b85a-b72c-4f92-bdd3-e55927b1ad3b', '5c7d3851-2f4b-4210-ae98-4af28258fab9', 'Paneer Butter Masala',  1, 320.00,  320.00, NULL),
  (gen_random_uuid(), '1004b85a-b72c-4f92-bdd3-e55927b1ad3b', '8bfa195a-adce-408b-b1fe-f717c0e2b625', 'Butter Naan',           6,  55.00,  330.00, NULL),
  (gen_random_uuid(), '1004b85a-b72c-4f92-bdd3-e55927b1ad3b', 'f7b34ab7-f703-4e71-9705-f131d55ebafe', 'Gulab Jamun (2 pcs)',   2,  90.00,  180.00, NULL)
ON CONFLICT DO NOTHING;

-- Update aggregator_source for delivery orders
UPDATE orders SET aggregator_source = 'ZOMATO' WHERE order_number = 'ORD-K010';
UPDATE orders SET aggregator_source = 'SWIGGY' WHERE order_number = 'ORD-K011';
UPDATE orders SET delivery_address = '12 Indiranagar, 100 Feet Road, Bangalore 560038'
  WHERE order_number = 'ORD-K010';
UPDATE orders SET delivery_address = '45 Koramangala, 5th Block, Bangalore 560095'
  WHERE order_number = 'ORD-K011';

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aviqr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aviqr;
