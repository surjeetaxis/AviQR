-- New, separate demo login that owns exactly ONE hotel (not part of the existing
-- chain) — so the plain single-hotel UI (no switcher dropdown) can actually be
-- seen/tested, distinct from the chain-owner demo login (gm@grandpalace.in) which
-- now owns 4 properties. Same demo password as every other seeded login
-- ("Axis321#") — password_hash below is copied verbatim from gm@grandpalace.in's
-- row so it's the identical bcrypt hash, not a new one.

\c aviqr_auth

INSERT INTO users (id, email, phone, password_hash, name, role, status, email_verified, phone_verified)
VALUES (
  'f4000001-0000-4000-8000-000000000001',
  'owner@riversideinn.in',
  '9000011223',
  '$2a$12$fU4Ge/h6XyV3Ou6lxUd6POwO1YoF6bBA1W4T.K0dUvsf0J68ZfWvW',
  'Riverside Inn',
  'HOTEL',
  'ACTIVE',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO NOTHING;

\c aviqr_hotel

INSERT INTO hotels (id, name, owner_id, phone, email, address, city, latitude, longitude, total_rooms, check_in_time, check_out_time, subscription_plan, active)
VALUES (
  'f5000001-0000-4000-8000-000000000001',
  'Riverside Inn',
  'f4000001-0000-4000-8000-000000000001',
  '9000011223',
  'owner@riversideinn.in',
  'Tapovan, Laxman Jhula Road',
  'Rishikesh',
  30.1252, 78.3212,
  4,
  '14:00', '11:00',
  'HOTEL_BASIC',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO hotel_access (id, hotel_id, user_id, role, outlet_id)
VALUES ('f6000001-0000-4000-8000-000000000001', 'f5000001-0000-4000-8000-000000000001', 'f4000001-0000-4000-8000-000000000001', 'OWNER', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, hotel_id, room_number, room_type, floor, status, guest_name, check_in_date, check_out_date, qr_active) VALUES
  ('f7000001-0000-4000-8000-000000000001', 'f5000001-0000-4000-8000-000000000001', '101', 'Standard',   '1st Floor', 'VACANT',   NULL,          NULL,          NULL,          TRUE),
  ('f7000001-0000-4000-8000-000000000002', 'f5000001-0000-4000-8000-000000000001', '102', 'Standard',   '1st Floor', 'VACANT',   NULL,          NULL,          NULL,          TRUE),
  ('f7000001-0000-4000-8000-000000000003', 'f5000001-0000-4000-8000-000000000001', '201', 'River View', '2nd Floor', 'OCCUPIED', 'Amit Verma',  'Sep 8, 2026', 'Sep 11, 2026', TRUE),
  ('f7000001-0000-4000-8000-000000000004', 'f5000001-0000-4000-8000-000000000001', '202', 'River View', '2nd Floor', 'VACANT',   NULL,          NULL,          NULL,          TRUE)
ON CONFLICT (id) DO NOTHING;

\c aviqr_pms

INSERT INTO pms_room_types (id, hotel_id, name, description, max_occupancy) VALUES
  ('f8000001-0000-4000-8000-000000000001', 'f5000001-0000-4000-8000-000000000001', 'Standard',   'Cozy room, garden-facing',   2),
  ('f8000001-0000-4000-8000-000000000002', 'f5000001-0000-4000-8000-000000000001', 'River View', 'Room overlooking the Ganga', 2)
ON CONFLICT DO NOTHING;

INSERT INTO pms_rate_plans (id, hotel_id, room_type_id, name, base_rate, cancellation_policy) VALUES
  ('f9000001-0000-4000-8000-000000000001', 'f5000001-0000-4000-8000-000000000001', 'f8000001-0000-4000-8000-000000000001', 'Standard — Flexible',   1800.00, 'Free cancellation until 24h before check-in'),
  ('f9000001-0000-4000-8000-000000000002', 'f5000001-0000-4000-8000-000000000001', 'f8000001-0000-4000-8000-000000000002', 'River View — Flexible', 2800.00, 'Free cancellation until 24h before check-in')
ON CONFLICT DO NOTHING;

INSERT INTO pms_guests (id, hotel_id, name, phone) VALUES
  ('fa000001-0000-4000-8000-000000000001', 'f5000001-0000-4000-8000-000000000001', 'Amit Verma', '9000099887')
ON CONFLICT DO NOTHING;

INSERT INTO pms_reservations (id, hotel_id, guest_id, guest_name, guest_phone, check_in_date, check_out_date, adults, status, source, created_by) VALUES
  ('fb000001-0000-4000-8000-000000000001', 'f5000001-0000-4000-8000-000000000001', 'fa000001-0000-4000-8000-000000000001', 'Amit Verma', '9000099887', CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE + INTERVAL '2 days', 2, 'CHECKED_IN', 'DIRECT', 'f4000001-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;

INSERT INTO pms_room_reservations (id, reservation_id, room_type_id, rate_plan_id, room_id, room_number, rate_per_night, actual_check_in_at) VALUES
  ('fc000001-0000-4000-8000-000000000001', 'fb000001-0000-4000-8000-000000000001', 'f8000001-0000-4000-8000-000000000002', 'f9000001-0000-4000-8000-000000000002', 'f7000001-0000-4000-8000-000000000003', '201', 2800.00, NOW() - INTERVAL '1 days')
ON CONFLICT DO NOTHING;
