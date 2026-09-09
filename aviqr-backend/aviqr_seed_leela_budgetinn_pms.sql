-- One-time production repair: The Leela Resort and Budget Inn Jaipur had a hotels
-- row and an OWNER access grant, but zero physical rooms (hotel-service) and zero
-- PMS room types/rate plans (pms-service) — so their Inventory & Rates Calendar,
-- Rate & Inventory Log and Room Types & Rates pages were all empty. Grand Palace
-- Hotel was the only one of the 3 demo hotels ever seeded with this data. Idempotent
-- (ON CONFLICT DO NOTHING everywhere an id is explicit; the rooms inserts are
-- guarded by a NOT EXISTS check since rooms.id auto-generates and has no natural
-- unique key to conflict on).

-- ============================================================
-- The Leela Resort (Goa) — 0a035141-82b3-4e32-ae79-024ff06dba3f
-- ============================================================

-- hotel-service: physical rooms (run against aviqr_hotel)
\c aviqr_hotel
INSERT INTO rooms (hotel_id, room_number, room_type, floor, status, qr_active)
SELECT * FROM (VALUES
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '101', 'Garden View Room',   'Garden Block',       'VACANT', TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '102', 'Garden View Room',   'Garden Block',       'VACANT', TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '201', 'Ocean View Suite',   'Ocean Block',        'VACANT', TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '202', 'Ocean View Suite',   'Ocean Block',        'VACANT', TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '301', 'Pool Villa',         'Pool Block',         'VACANT', TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '302', 'Pool Villa',         'Pool Block',         'VACANT', TRUE),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '401', 'Presidential Villa', 'Presidential Block', 'VACANT', TRUE)
) AS v(hotel_id, room_number, room_type, floor, status, qr_active)
WHERE NOT EXISTS (
  SELECT 1 FROM rooms r WHERE r.hotel_id = v.hotel_id AND r.room_number = v.room_number
);

-- ============================================================
-- Budget Inn Jaipur — 2673d4b8-7f7c-4c61-8df9-2f775d482873
-- ============================================================

INSERT INTO rooms (hotel_id, room_number, room_type, floor, status, qr_active)
SELECT * FROM (VALUES
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '101', 'Single Room', '1st Floor', 'VACANT', TRUE),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '102', 'Single Room', '1st Floor', 'VACANT', TRUE),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '201', 'Double Room', '2nd Floor', 'VACANT', TRUE),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '202', 'Double Room', '2nd Floor', 'VACANT', TRUE),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '301', 'Triple Room', '3rd Floor', 'VACANT', TRUE),
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, '302', 'Triple Room', '3rd Floor', 'VACANT', TRUE)
) AS v(hotel_id, room_number, room_type, floor, status, qr_active)
WHERE NOT EXISTS (
  SELECT 1 FROM rooms r WHERE r.hotel_id = v.hotel_id AND r.room_number = v.room_number
);

-- pms-service: room types + rate plans (run against aviqr_pms)
\c aviqr_pms

INSERT INTO pms_room_types (id, hotel_id, name, description, max_occupancy) VALUES
  ('e1010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Garden View Room',   'Ground-floor room opening onto the resort gardens', 2),
  ('e1010001-0000-4000-8000-000000000002', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Ocean View Suite',   'Suite with a private balcony facing the Arabian Sea', 3),
  ('e1010001-0000-4000-8000-000000000003', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Pool Villa',         'Standalone villa with a private plunge pool', 4),
  ('e1010001-0000-4000-8000-000000000004', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Presidential Villa', 'Two-bedroom villa with private butler service', 4)
ON CONFLICT DO NOTHING;

INSERT INTO pms_rate_plans (id, hotel_id, room_type_id, name, base_rate, cancellation_policy) VALUES
  ('e2010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e1010001-0000-4000-8000-000000000001', 'Garden View — Flexible',   6500.00,  'Free cancellation until 24h before check-in'),
  ('e2010001-0000-4000-8000-000000000002', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e1010001-0000-4000-8000-000000000002', 'Ocean View — Flexible',    9800.00,  'Free cancellation until 48h before check-in'),
  ('e2010001-0000-4000-8000-000000000003', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e1010001-0000-4000-8000-000000000003', 'Pool Villa — Flexible',    15000.00, 'Free cancellation until 72h before check-in'),
  ('e2010001-0000-4000-8000-000000000004', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e1010001-0000-4000-8000-000000000004', 'Presidential — Non-refundable', 28000.00, 'Non-refundable')
ON CONFLICT DO NOTHING;

INSERT INTO pms_room_types (id, hotel_id, name, description, max_occupancy) VALUES
  ('e1020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Single Room', 'Compact room with a single bed',   1),
  ('e1020001-0000-4000-8000-000000000002', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Double Room', 'Room with a double bed',            2),
  ('e1020001-0000-4000-8000-000000000003', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Triple Room', 'Room with a double + single bed',   3)
ON CONFLICT DO NOTHING;

INSERT INTO pms_rate_plans (id, hotel_id, room_type_id, name, base_rate, cancellation_policy) VALUES
  ('e2020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e1020001-0000-4000-8000-000000000001', 'Single — Standard', 1200.00, 'Free cancellation until 24h before check-in'),
  ('e2020001-0000-4000-8000-000000000002', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e1020001-0000-4000-8000-000000000002', 'Double — Standard', 1800.00, 'Free cancellation until 24h before check-in'),
  ('e2020001-0000-4000-8000-000000000003', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e1020001-0000-4000-8000-000000000003', 'Triple — Standard', 2500.00, 'Free cancellation until 24h before check-in')
ON CONFLICT DO NOTHING;
