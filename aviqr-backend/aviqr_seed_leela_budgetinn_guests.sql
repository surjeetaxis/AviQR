-- One-time production repair: The Leela Resort and Budget Inn Jaipur had rooms and
-- PMS room types/rate plans (see aviqr_seed_leela_budgetinn_pms.sql) but zero guests,
-- reservations, or guest requests — so Guests/Reservations/Overview occupancy and the
-- Guest Requests page were all empty for both hotels. Dates are relative to NOW() so
-- these stay "currently in-house" as real time moves on, same convention as Grand
-- Palace Hotel's seed. Idempotent via ON CONFLICT DO NOTHING (explicit ids) and a
-- NOT EXISTS guard on the two auto-id tables (room_requests, guest_service_requests).

-- ============================================================
-- The Leela Resort (Goa) — 0a035141-82b3-4e32-ae79-024ff06dba3f
-- ============================================================

\c aviqr_hotel

UPDATE rooms SET status='OCCUPIED', guest_name='Priya Nair',   check_in_date='Sep 7, 2026',  check_out_date='Sep 12, 2026' WHERE id='19a84243-b27e-4fac-a20b-18bc191c0855';
UPDATE rooms SET status='OCCUPIED', guest_name='Arjun Menon',  check_in_date='Sep 8, 2026',  check_out_date='Sep 13, 2026' WHERE id='1ca98154-b674-4289-9aa8-9537c24a7caa';
UPDATE rooms SET status='OCCUPIED', guest_name='Divya Shenoy', check_in_date='Sep 6, 2026',  check_out_date='Sep 11, 2026' WHERE id='836a1fac-d71b-4505-b5a8-e2b260a2fc94';

INSERT INTO room_requests (hotel_id, room_number, service_type, description, status, priority, created_at, resolved_at)
SELECT * FROM (VALUES
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '101', 'ROOM_SERVICE',  'Fresh coconut water x2 to the room',              'NEW',       'NORMAL', NOW() - INTERVAL '10 min', NULL::timestamp),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '201', 'CONCIERGE',     'Book a sunset cruise for 2 tomorrow evening',     'PREPARING', 'NORMAL', NOW() - INTERVAL '25 min', NULL::timestamp),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '301', 'HOUSEKEEPING',  'Extra bath towels and beach towels',              'DONE',      'NORMAL', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 min')
) AS v(hotel_id, room_number, service_type, description, status, priority, created_at, resolved_at)
WHERE NOT EXISTS (
  SELECT 1 FROM room_requests r WHERE r.hotel_id=v.hotel_id AND r.room_number=v.room_number AND r.description=v.description
);

INSERT INTO guest_service_requests (hotel_id, room_number, guest_name, type, details, priority, status, created_at, completed_at)
SELECT * FROM (VALUES
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '101', 'Priya Nair',   'AMENITIES',   'Extra pillow and a yoga mat',                'NORMAL', 'NEW',     NOW() - INTERVAL '8 min',  NULL::timestamp),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '201', 'Arjun Menon',  'CONCIERGE',   'Airport pickup tomorrow at 6 AM',            'NORMAL', 'ACCEPTED',NOW() - INTERVAL '40 min', NULL::timestamp),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '301', 'Divya Shenoy', 'MAINTENANCE', 'Villa pool filter making noise',             'HIGH',   'NEW',     NOW() - INTERVAL '15 min', NULL::timestamp)
) AS v(hotel_id, room_number, guest_name, type, details, priority, status, created_at, completed_at)
WHERE NOT EXISTS (
  SELECT 1 FROM guest_service_requests g WHERE g.hotel_id=v.hotel_id AND g.room_number=v.room_number AND g.details=v.details
);

\c aviqr_pms

INSERT INTO pms_guests (id, hotel_id, name, phone) VALUES
  ('e6010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Priya Nair',   '9822011122'),
  ('e6010001-0000-4000-8000-000000000002', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Arjun Menon',  '9822055566'),
  ('e6010001-0000-4000-8000-000000000003', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Divya Shenoy', '9822077788')
ON CONFLICT DO NOTHING;

INSERT INTO pms_reservations (id, hotel_id, guest_id, guest_name, guest_phone, check_in_date, check_out_date, adults, status, source, created_by) VALUES
  ('e3010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e6010001-0000-4000-8000-000000000001', 'Priya Nair',   '9822011122', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '3 days',  2, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2'),
  ('e3010001-0000-4000-8000-000000000002', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e6010001-0000-4000-8000-000000000002', 'Arjun Menon',  '9822055566', CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE + INTERVAL '4 days',  2, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2'),
  ('e3010001-0000-4000-8000-000000000003', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e6010001-0000-4000-8000-000000000003', 'Divya Shenoy', '9822077788', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days',  1, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2'),
  ('e3010001-0000-4000-8000-000000000004', '0a035141-82b3-4e32-ae79-024ff06dba3f', NULL,                                    'Karthik Iyer', '9822033344', CURRENT_DATE + INTERVAL '15 days',CURRENT_DATE + INTERVAL '18 days', 2, 'BOOKED',     'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2')
ON CONFLICT DO NOTHING;

INSERT INTO pms_room_reservations (id, reservation_id, room_type_id, rate_plan_id, room_id, room_number, rate_per_night, actual_check_in_at) VALUES
  ('e4010001-0000-4000-8000-000000000001', 'e3010001-0000-4000-8000-000000000001', 'e1010001-0000-4000-8000-000000000001', 'e2010001-0000-4000-8000-000000000001', '19a84243-b27e-4fac-a20b-18bc191c0855', '101', 6500.00,  NOW() - INTERVAL '2 days'),
  ('e4010001-0000-4000-8000-000000000002', 'e3010001-0000-4000-8000-000000000002', 'e1010001-0000-4000-8000-000000000002', 'e2010001-0000-4000-8000-000000000002', '1ca98154-b674-4289-9aa8-9537c24a7caa', '201', 9800.00,  NOW() - INTERVAL '1 days'),
  ('e4010001-0000-4000-8000-000000000003', 'e3010001-0000-4000-8000-000000000003', 'e1010001-0000-4000-8000-000000000003', 'e2010001-0000-4000-8000-000000000003', '836a1fac-d71b-4505-b5a8-e2b260a2fc94', '301', 15000.00, NOW() - INTERVAL '3 days'),
  ('e4010001-0000-4000-8000-000000000004', 'e3010001-0000-4000-8000-000000000004', 'e1010001-0000-4000-8000-000000000001', 'e2010001-0000-4000-8000-000000000001', 'f5a31230-1420-4605-a6b0-56417e43f3e6', '102', 6500.00,  NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Budget Inn Jaipur — 2673d4b8-7f7c-4c61-8df9-2f775d482873
-- ============================================================

\c aviqr_hotel

UPDATE rooms SET status='OCCUPIED', guest_name='Suresh Yadav', check_in_date='Sep 8, 2026', check_out_date='Sep 11, 2026' WHERE id='e751946c-b3de-4a7d-a2e5-3a6eb39b45d0';
UPDATE rooms SET status='OCCUPIED', guest_name='Neha Agarwal', check_in_date='Sep 7, 2026', check_out_date='Sep 10, 2026' WHERE id='4b955e85-af6b-436e-9afa-e8399c2779e0';

INSERT INTO room_requests (hotel_id, room_number, service_type, description, status, priority, created_at, resolved_at)
SELECT * FROM (VALUES
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '101', 'HOUSEKEEPING', 'Change bedsheets and towels',        'NEW',  'NORMAL', NOW() - INTERVAL '18 min', NULL::timestamp),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '201', 'ROOM_SERVICE', '2 cups of masala chai',              'DONE', 'NORMAL', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours')
) AS v(hotel_id, room_number, service_type, description, status, priority, created_at, resolved_at)
WHERE NOT EXISTS (
  SELECT 1 FROM room_requests r WHERE r.hotel_id=v.hotel_id AND r.room_number=v.room_number AND r.description=v.description
);

INSERT INTO guest_service_requests (hotel_id, room_number, guest_name, type, details, priority, status, created_at, completed_at)
SELECT * FROM (VALUES
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '101', 'Suresh Yadav', 'MAINTENANCE', 'Room fan making a rattling sound', 'NORMAL', 'NEW', NOW() - INTERVAL '22 min', NULL::timestamp),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '201', 'Neha Agarwal', 'CONCIERGE',   'Need a taxi to the railway station at 5 AM', 'NORMAL', 'ACCEPTED', NOW() - INTERVAL '50 min', NULL::timestamp)
) AS v(hotel_id, room_number, guest_name, type, details, priority, status, created_at, completed_at)
WHERE NOT EXISTS (
  SELECT 1 FROM guest_service_requests g WHERE g.hotel_id=v.hotel_id AND g.room_number=v.room_number AND g.details=v.details
);

\c aviqr_pms

INSERT INTO pms_guests (id, hotel_id, name, phone) VALUES
  ('e6020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Suresh Yadav', '9414011122'),
  ('e6020001-0000-4000-8000-000000000002', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Neha Agarwal', '9414055566')
ON CONFLICT DO NOTHING;

INSERT INTO pms_reservations (id, hotel_id, guest_id, guest_name, guest_phone, check_in_date, check_out_date, adults, status, source, created_by) VALUES
  ('e3020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e6020001-0000-4000-8000-000000000001', 'Suresh Yadav', '9414011122', CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE + INTERVAL '2 days',  1, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2'),
  ('e3020001-0000-4000-8000-000000000002', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e6020001-0000-4000-8000-000000000002', 'Neha Agarwal', '9414055566', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '1 days',  2, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2'),
  ('e3020001-0000-4000-8000-000000000003', '2673d4b8-7f7c-4c61-8df9-2f775d482873', NULL,                                    'Vikram Joshi', '9414033344', CURRENT_DATE + INTERVAL '10 days',CURRENT_DATE + INTERVAL '12 days', 3, 'BOOKED',     'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2')
ON CONFLICT DO NOTHING;

INSERT INTO pms_room_reservations (id, reservation_id, room_type_id, rate_plan_id, room_id, room_number, rate_per_night, actual_check_in_at) VALUES
  ('e4020001-0000-4000-8000-000000000001', 'e3020001-0000-4000-8000-000000000001', 'e1020001-0000-4000-8000-000000000001', 'e2020001-0000-4000-8000-000000000001', 'e751946c-b3de-4a7d-a2e5-3a6eb39b45d0', '101', 1200.00, NOW() - INTERVAL '1 days'),
  ('e4020001-0000-4000-8000-000000000002', 'e3020001-0000-4000-8000-000000000002', 'e1020001-0000-4000-8000-000000000002', 'e2020001-0000-4000-8000-000000000002', '4b955e85-af6b-436e-9afa-e8399c2779e0', '201', 1800.00, NOW() - INTERVAL '2 days'),
  ('e4020001-0000-4000-8000-000000000003', 'e3020001-0000-4000-8000-000000000003', 'e1020001-0000-4000-8000-000000000003', 'e2020001-0000-4000-8000-000000000003', '34138ce0-f482-48a1-90cf-ce30a9184d8f', '301', 2500.00, NULL)
ON CONFLICT DO NOTHING;
