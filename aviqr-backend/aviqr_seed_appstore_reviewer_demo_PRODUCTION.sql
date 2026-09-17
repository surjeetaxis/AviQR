-- ============================================================
--  PRODUCTION-ONLY seed: App Store reviewer demo account
-- ============================================================
--
-- READ BEFORE RUNNING.
--
-- GO_LIVE_PLAN.md's stated policy is "No demo/seed data in production —
-- Liquibase migrations only." This script is a deliberate, narrow exception
-- to that policy for GO_LIVE_PLAN.md Phase 14's still-open TODO:
--   "Prepare reviewer access — the single most common rejection reason for
--    this kind of app: a demo owner account + a fixed QR code routing to a
--    seeded demo shop, with working credentials in App Store Connect's
--    review notes."
--
-- This is NOT wired into deploy.sh, the GitHub Actions deploy workflow, or
-- any other automated path. Nothing runs this for you. Review every insert
-- below, then run it yourself, once, directly against the production
-- Postgres databases (same 12 databases as aviqr_setup.sql — aviqr_auth,
-- aviqr_shop, aviqr_menu, aviqr_order — using whatever production DB host/
-- credentials you already use for production access, e.g.:
--
--   psql "host=<prod-db-host> dbname=aviqr_auth user=<prod-user> sslmode=require" -f aviqr_seed_appstore_reviewer_demo_PRODUCTION.sql
--
-- or connect once and let the \c commands below switch databases on the
-- same server, if all four databases live on one Postgres instance in
-- production the way they do locally.
--
-- All inserts use ON CONFLICT DO NOTHING and fixed ids (the same 10000000...
-- ids as the dev/staging copy in aviqr_seed_appstore_reviewer_demo.sql), so
-- running this twice is safe, and the account/shop/QR code are identical
-- between environments — only the target_url below already points at the
-- real production domain (aviqr.com).
--
-- Credentials for App Store Connect review notes once this has run:
--   Email:    appstore-reviewer@aviqr.com
--   Password: (kept out of source control — see the team's password manager / App Store Connect review notes)
--   Or just scan/open the QR target: https://aviqr.com/menu/10000000-0000-4000-8000-000000000002
--
-- This account should be excluded from any production revenue/MRR reporting
-- and from customer-facing "nearby shops" discovery if that's geo-driven —
-- check before relying on it being invisible to real customers.

\c aviqr_auth

INSERT INTO users (id, email, phone, password_hash, name, role, status, shop_id, email_verified, phone_verified, preferred_language, created_at)
VALUES (
  '10000000-0000-4000-8000-000000000001', 'appstore-reviewer@aviqr.com', '9000099999',
  '$2y$12$FojkI7BsL/kq72H8cbkSreaGjGryKQBW9ZKyp4Bl5PMAIZ54KRuUm',
  'AviQR Demo Kitchen', 'OWNER', 'ACTIVE', '10000000-0000-4000-8000-000000000002', TRUE, TRUE, 'en', NOW()
)
ON CONFLICT (email) DO NOTHING;

\c aviqr_shop

INSERT INTO shops (id, name, tagline, owner_id, phone, email, address, city, state, pincode, subscription_plan, min_order_amount, table_count, status, rating, rating_count, completion_rate, latitude, longitude, created_at)
VALUES (
  '10000000-0000-4000-8000-000000000002', 'AviQR Demo Kitchen', 'App Store review demo — sample menu for testing',
  '10000000-0000-4000-8000-000000000001', '9000099999', 'appstore-reviewer@aviqr.com',
  '1, Demo Street, Indiranagar', 'Bengaluru', 'Karnataka', '560038',
  'BUSINESS', 0, 4, 'ACTIVE', 4.60, 25, 92.00, 12.97160, 77.59460, NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shop_opening_hours (shop_id, day_of_week, open, open_time, close_time) VALUES
  ('10000000-0000-4000-8000-000000000002', 'MONDAY',    TRUE, '09:00', '22:00'),
  ('10000000-0000-4000-8000-000000000002', 'TUESDAY',   TRUE, '09:00', '22:00'),
  ('10000000-0000-4000-8000-000000000002', 'WEDNESDAY', TRUE, '09:00', '22:00'),
  ('10000000-0000-4000-8000-000000000002', 'THURSDAY',  TRUE, '09:00', '22:00'),
  ('10000000-0000-4000-8000-000000000002', 'FRIDAY',    TRUE, '09:00', '22:30'),
  ('10000000-0000-4000-8000-000000000002', 'SATURDAY',  TRUE, '09:00', '22:30'),
  ('10000000-0000-4000-8000-000000000002', 'SUNDAY',    TRUE, '09:00', '22:00')
ON CONFLICT DO NOTHING;

INSERT INTO shop_settings (shop_id, cash_enabled, online_enabled, wallet_enabled, tax_percent, loyalty_enabled, business_name)
VALUES ('10000000-0000-4000-8000-000000000002', TRUE, TRUE, FALSE, 5.00, FALSE, 'AviQR Demo Kitchen')
ON CONFLICT (shop_id) DO NOTHING;

\c aviqr_menu

INSERT INTO categories (id, name, emoji, shop_id, sort_order, active) VALUES
  ('10000000-0000-4000-8000-000000000003', 'Starters', '🥗', '10000000-0000-4000-8000-000000000002', 1, TRUE),
  ('10000000-0000-4000-8000-000000000004', 'Mains',    '🍛', '10000000-0000-4000-8000-000000000002', 2, TRUE),
  ('10000000-0000-4000-8000-000000000005', 'Beverages','🥤', '10000000-0000-4000-8000-000000000002', 3, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, name, description, category_id, shop_id, price, image_url, veg, spicy, popular, available, tag, sort_order) VALUES
  ('10000000-0000-4000-8000-000000000006', 'Paneer Tikka',   'Marinated cottage cheese grilled in tandoor with bell peppers', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 280.00, 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Panir_Tikka_Indian_cheese_grilled.jpg/960px-Panir_Tikka_Indian_cheese_grilled.jpg', TRUE,  FALSE, TRUE, TRUE, 'bestseller', 1),
  ('10000000-0000-4000-8000-000000000007', 'Samosa (2 pcs)', 'Crispy fried pastry with spiced potato and pea filling',        '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 80.00,  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Samosa_4.jpg/960px-Samosa_4.jpg', TRUE,  FALSE, FALSE, TRUE, NULL, 2),
  ('10000000-0000-4000-8000-000000000008', 'Butter Chicken', 'Tender chicken in a velvety tomato-butter sauce',                '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 380.00, 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Chicken_butter_masala.jpg/960px-Chicken_butter_masala.jpg', FALSE, FALSE, TRUE, TRUE, 'bestseller', 1),
  ('10000000-0000-4000-8000-000000000009', 'Dal Makhani',    'Black lentils slow-cooked overnight in butter and cream',        '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 280.00, 'https://upload.wikimedia.org/wikipedia/commons/f/f8/Dal_Makhani.jpg', TRUE,  FALSE, TRUE, TRUE, 'bestseller', 2),
  ('10000000-0000-4000-8000-000000000010', 'Masala Chai',    'Freshly brewed spiced Indian tea with milk',                     '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 40.00,  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Masala_Tea_-_2.jpg/960px-Masala_Tea_-_2.jpg', TRUE,  FALSE, FALSE, TRUE, NULL, 1),
  ('10000000-0000-4000-8000-000000000011', 'Fresh Lime Soda','Freshly squeezed lime with soda, salted or sweet',               '10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002', 60.00,  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Cider_%28lemon-lime_drink%29.jpg/960px-Cider_%28lemon-lime_drink%29.jpg', TRUE,  FALSE, FALSE, TRUE, NULL, 2)
ON CONFLICT (id) DO NOTHING;

\c aviqr_order

INSERT INTO qr_codes (id, qr_code, target_url, shop_id, label, type, scan_count, active) VALUES
  ('10000000-0000-4000-8000-000000000012', 'aviqr-demo-review', 'https://aviqr.com/menu/10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'App Store Review QR', 'SHOP', 0, TRUE)
ON CONFLICT (qr_code) DO NOTHING;
