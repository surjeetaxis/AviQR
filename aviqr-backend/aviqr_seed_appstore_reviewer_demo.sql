-- App Store reviewer demo account — GO_LIVE_PLAN.md Phase 14: "Prepare reviewer
-- access — a demo owner account + a fixed QR code routing to a seeded demo shop,
-- with working credentials in App Store Connect's review notes."
--
-- Dedicated login (not reused from any other seeded account), so it can be handed
-- to App Store Connect review notes without needing to explain which of the other
-- demo logins is "the" one to use. Password is NOT the shared dev password
-- ("Axis321#") on purpose — see aviqr_seed_appstore_reviewer_demo_PRODUCTION.sql,
-- which seeds the identical account (same ids) into production so the review
-- notes work against the real app store build.
--
--   Email:    appstore-reviewer@aviqr.com
--   Password: AviQRReview#2026
--   Shop:     AviQR Demo Kitchen (Bengaluru) — pre-populated menu
--   QR code:  aviqr-demo-review -> https://aviqr.com/menu/10000000-0000-4000-8000-000000000002

\c aviqr_auth

INSERT INTO users (id, email, phone, password_hash, name, role, status, shop_id, email_verified, phone_verified, preferred_language, created_at)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  'appstore-reviewer@aviqr.com',
  '9000099999',
  '$2y$12$FojkI7BsL/kq72H8cbkSreaGjGryKQBW9ZKyp4Bl5PMAIZ54KRuUm',
  'AviQR Demo Kitchen',
  'OWNER',
  'ACTIVE',
  '10000000-0000-4000-8000-000000000002',
  TRUE,
  TRUE,
  'en',
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (email) DO NOTHING;

\c aviqr_shop

INSERT INTO shops (id, name, tagline, owner_id, phone, email, address, city, state, pincode, subscription_plan, min_order_amount, table_count, status, rating, rating_count, completion_rate, latitude, longitude, created_at)
VALUES (
  '10000000-0000-4000-8000-000000000002',
  'AviQR Demo Kitchen',
  'App Store review demo — sample menu for testing',
  '10000000-0000-4000-8000-000000000001',
  '9000099999',
  'appstore-reviewer@aviqr.com',
  '1, Demo Street, Indiranagar',
  'Bengaluru',
  'Karnataka',
  '560038',
  'BUSINESS',
  0,
  4,
  'ACTIVE',
  4.60, 25, 92.00,
  12.97160, 77.59460,
  NOW() - INTERVAL '10 days'
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
