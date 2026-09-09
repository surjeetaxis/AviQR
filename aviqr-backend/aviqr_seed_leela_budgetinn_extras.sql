-- One-time production repair: seeds the remaining "advanced feature" areas that
-- were only ever populated for Grand Palace Hotel — housekeeping/maintenance task
-- history, travel agents, discount packages, add-ons, surcharges, a voucher, loyalty
-- and dynamic-pricing config, a channel-manager mapping, and a couple of rate-change
-- log entries — for The Leela Resort and Budget Inn Jaipur.
--
-- Deliberately NOT included: outlet_bookings and room_charges. Both are intrinsically
-- tied to a real outlet (a linked shop-mall-service Shop with menu/POS), and neither
-- hotel has any outlets provisioned — see aviqr_seed_leela_budgetinn_pms.sql's note
-- and the session's earlier "Outlets" check. Faking those rows against a nonexistent
-- outlet would be more misleading than an honest empty state. Provisioning real
-- outlets (as was done for Grand Palace) is a separate, larger piece of work.

-- ============================================================
-- The Leela Resort (Goa) — 0a035141-82b3-4e32-ae79-024ff06dba3f
-- ============================================================

\c aviqr_hotel

INSERT INTO housekeeping_tasks (hotel_id, room_id, room_number, status, priority, assigned_to, notes, created_at, started_at, completed_at)
SELECT * FROM (VALUES
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '2eaa2679-bfc1-4de8-8cd8-569f19700c65'::uuid, '202', 'PENDING',    'NORMAL', NULL::text,            'Turnover clean after checkout',        NOW() - INTERVAL '2 hours', NULL::timestamp,           NULL::timestamp),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, 'b3b08834-b150-4105-8f77-e1871a9b001e'::uuid, '302', 'DONE',       'NORMAL', 'Housekeeping — Leela', 'Deep clean before next guest',         NOW() - INTERVAL '1 day',  NOW() - INTERVAL '23 hours', NOW() - INTERVAL '22 hours')
) AS v(hotel_id, room_id, room_number, status, priority, assigned_to, notes, created_at, started_at, completed_at)
WHERE NOT EXISTS (SELECT 1 FROM housekeeping_tasks h WHERE h.hotel_id=v.hotel_id AND h.room_id=v.room_id AND h.notes=v.notes);

INSERT INTO maintenance_tasks (hotel_id, room_id, room_number, title, notes, status, priority, assigned_to, created_at, started_at, completed_at)
SELECT * FROM (VALUES
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, '836a1fac-d71b-4505-b5a8-e2b260a2fc94'::uuid, '301', 'Villa pool filter making noise', 'Guest-raised — see guest_service_requests', 'OPEN',       'HIGH',   NULL::text,      NOW() - INTERVAL '15 min', NULL::timestamp,           NULL::timestamp),
  ('0a035141-82b3-4e32-ae79-024ff06dba3f'::uuid, 'f5a31230-1420-4605-a6b0-56417e43f3e6'::uuid, '102', 'AC service — annual maintenance', 'Routine servicing before next booking',     'DONE',       'NORMAL', 'Maintenance — Leela', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
) AS v(hotel_id, room_id, room_number, title, notes, status, priority, assigned_to, created_at, started_at, completed_at)
WHERE NOT EXISTS (SELECT 1 FROM maintenance_tasks m WHERE m.hotel_id=v.hotel_id AND m.room_id=v.room_id AND m.title=v.title);

-- ============================================================
-- Budget Inn Jaipur — 2673d4b8-7f7c-4c61-8df9-2f775d482873
-- ============================================================

INSERT INTO housekeeping_tasks (hotel_id, room_id, room_number, status, priority, assigned_to, notes, created_at, started_at, completed_at)
SELECT * FROM (VALUES
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, 'ec20688b-1729-40fb-99a1-8eb7f15b8694'::uuid, '102', 'PENDING', 'NORMAL', NULL::text, 'Turnover clean after checkout', NOW() - INTERVAL '1 hour', NULL::timestamp, NULL::timestamp)
) AS v(hotel_id, room_id, room_number, status, priority, assigned_to, notes, created_at, started_at, completed_at)
WHERE NOT EXISTS (SELECT 1 FROM housekeeping_tasks h WHERE h.hotel_id=v.hotel_id AND h.room_id=v.room_id AND h.notes=v.notes);

INSERT INTO maintenance_tasks (hotel_id, room_id, room_number, title, notes, status, priority, assigned_to, created_at, started_at, completed_at)
SELECT * FROM (VALUES
  ('2673d4b8-7f7c-4c61-8df9-2f775d482873'::uuid, 'e751946c-b3de-4a7d-a2e5-3a6eb39b45d0'::uuid, '101', 'Room fan making a rattling sound', 'Guest-raised — see guest_service_requests', 'OPEN', 'NORMAL', NULL::text, NOW() - INTERVAL '22 min', NULL::timestamp, NULL::timestamp)
) AS v(hotel_id, room_id, room_number, title, notes, status, priority, assigned_to, created_at, started_at, completed_at)
WHERE NOT EXISTS (SELECT 1 FROM maintenance_tasks m WHERE m.hotel_id=v.hotel_id AND m.room_id=v.room_id AND m.title=v.title);

-- ============================================================
-- pms-service: agents, discounts, add-ons, surcharges, vouchers,
-- loyalty/dynamic-pricing configs, a channel mapping, rate-change log
-- ============================================================

\c aviqr_pms

INSERT INTO pms_agents (id, hotel_id, name, contact_person, phone, email, commission_percent) VALUES
  ('e7010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Coastal Getaways',      'Rohan D''Souza', '9822099887', 'rohan@coastalgetaways.example', 15.00),
  ('e7020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Rajasthan Road Trips',  'Anita Sharma',   '9414099887', 'anita@rajasthanroadtrips.example', 10.00)
ON CONFLICT DO NOTHING;

INSERT INTO pms_discount_packages (id, hotel_id, name, value_type, value, active) VALUES
  ('e8010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Monsoon Special 15%', 'PERCENT', 15.00, TRUE),
  ('e8020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Long Stay 10%',       'PERCENT', 10.00, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO pms_addons (id, hotel_id, name, description, price, active) VALUES
  ('e9010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Sunset Cruise',    'Private 2-hour sunset cruise for 2', 3500.00, TRUE),
  ('e9010001-0000-4000-8000-000000000002', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Airport Transfer', 'One-way transfer from Goa airport',  1200.00, TRUE),
  ('e9020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'Railway Pickup',   'One-way transfer from Jaipur station', 300.00, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO pms_surcharges (id, hotel_id, name, value_type, value, active) VALUES
  ('ea010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'Resort Fee', 'FIXED', 350.00, TRUE),
  ('ea020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'City Tax',   'FIXED', 50.00,  TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO pms_vouchers (id, hotel_id, code, initial_value, balance, active) VALUES
  ('eb010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'LEELA1000', 1000.00, 1000.00, TRUE),
  ('eb020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'BUDGET200', 200.00,  200.00,  TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO pms_loyalty_configs (id, hotel_id, earn_rate_percent, redemption_value, active) VALUES
  ('ec010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 5.00, 1.00, TRUE),
  ('ec020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 3.00, 1.00, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO pms_dynamic_pricing_configs (id, hotel_id, high_occupancy_threshold, high_occupancy_surcharge_percent, low_occupancy_threshold, low_occupancy_discount_percent, active) VALUES
  ('ed010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 80.00, 20.00, 30.00, 10.00, TRUE),
  ('ed020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 80.00, 15.00, 30.00, 10.00, TRUE)
ON CONFLICT DO NOTHING;

-- Channel manager: one demo mapping each, same "simulated — no cmBaseUrl" pattern
-- Grand Palace's Standard/BOOKING_COM mapping uses.
INSERT INTO pms_channel_mappings (id, hotel_id, room_type_id, channel, external_property_id, external_room_type_id, external_rate_plan_id, webhook_secret, active) VALUES
  ('ee010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e1010001-0000-4000-8000-000000000001', 'BOOKING_COM', 'BDC-LEELA-01',  'BDC-GVR', 'BDC-RATE-GVR-FLEX', 'demo0secret0webhook0key0leela',  TRUE),
  ('ee020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e1020001-0000-4000-8000-000000000001', 'BOOKING_COM', 'BDC-BUDGETINN-01', 'BDC-SGL', 'BDC-RATE-SGL-STD', 'demo0secret0webhook0key0budget', TRUE)
ON CONFLICT DO NOTHING;

-- A couple of illustrative rate-change-log entries so the Rate & Inventory Log
-- page isn't empty either — mirrors an owner having set an opening price once.
INSERT INTO pms_rate_change_logs (id, hotel_id, room_type_id, rate_plan_id, date, field, old_value, new_value, changed_by, changed_at) VALUES
  ('ef010001-0000-4000-8000-000000000001', '0a035141-82b3-4e32-ae79-024ff06dba3f', 'e1010001-0000-4000-8000-000000000001', 'e2010001-0000-4000-8000-000000000001', CURRENT_DATE, 'price', NULL, '6500', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', NOW() - INTERVAL '2 days'),
  ('ef020001-0000-4000-8000-000000000001', '2673d4b8-7f7c-4c61-8df9-2f775d482873', 'e1020001-0000-4000-8000-000000000001', 'e2020001-0000-4000-8000-000000000001', CURRENT_DATE, 'price', NULL, '1200', '640e1946-5ffe-41cb-8be5-8ba499c08bd2', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
