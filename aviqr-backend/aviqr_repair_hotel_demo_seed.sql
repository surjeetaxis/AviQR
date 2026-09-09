-- ==============================================================================
--  aviqr_repair_hotel_demo_seed.sql — ONE-TIME repair for the production
--  aviqr_pms database, run 2026-09-09.
--
--  Root cause: aviqr_setup.sql seeded aviqr_hotel.rooms directly with 3
--  OCCUPIED rooms (101/Anjali Singh, 201/Ravi Kumar, 301/Meena Pillai) via
--  raw SQL, bypassing the app's check-in flow (ReservationService.checkIn ->
--  HotelServiceClient.updateRoomOccupancy) entirely. But aviqr_pms.
--  pms_reservations was only ever seeded with a matching row for Anjali (and
--  a booked-not-checked-in Karan Mehta) — Ravi and Meena had no reservation
--  at all — and pms_guests had zero rows for anyone, since raw SQL skips
--  GuestService.findOrCreate(). Since Overview/Occupancy/RevPAR/"Guests
--  in-house" and the Guests page are all computed from pms_reservations/
--  pms_guests (never from rooms.guest_name), this made the Rooms grid and
--  the rest of the dashboard visibly disagree in production.
--
--  This script only adds/updates rows for the 3 hotel-role demo accounts'
--  home hotel (Grand Palace, ccbe65f3-...) and only touches the specific
--  rows this seed gap left inconsistent — it does not touch Karan Mehta's
--  reservation (its status was already changed to NO_SHOW via real app
--  usage since seeding) or any other hotel/data.
--
--  Safe to re-run: guest/reservation/room_reservation inserts use fixed IDs
--  with ON CONFLICT DO NOTHING; the two UPDATEs are idempotent (each is a
--  no-op once applied).
--
--  Run as: sudo -u postgres psql -d aviqr_pms -f aviqr_repair_hotel_demo_seed.sql
-- ==============================================================================

-- Guests: one pms_guests row per seeded demo guest, matching the app's real
-- check-in flow (which always creates one via GuestService.findOrCreate).
INSERT INTO pms_guests (id, hotel_id, name, phone) VALUES
  ('d6000001-0000-4000-8000-000000000001', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Anjali Singh', '9800011122'),
  ('d6000001-0000-4000-8000-000000000002', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Ravi Kumar',   '9800055566'),
  ('d6000001-0000-4000-8000-000000000003', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'Meena Pillai', '9800077788')
ON CONFLICT DO NOTHING;

-- Backfill Anjali's existing reservation with a guest_id (never set, since it
-- was inserted via raw SQL) and refresh her stay to be "currently in-house"
-- relative to today instead of a June 2026 date that's now in the past.
UPDATE pms_reservations
SET guest_id = 'd6000001-0000-4000-8000-000000000001',
    check_in_date = CURRENT_DATE - INTERVAL '2 days',
    check_out_date = CURRENT_DATE + INTERVAL '2 days'
WHERE id = 'd3000001-0000-4000-8000-000000000001';

-- New reservations for Ravi Kumar (room 201) and Meena Pillai (room 301) —
-- previously missing entirely despite their rooms being OCCUPIED.
INSERT INTO pms_reservations (id, hotel_id, guest_id, guest_name, guest_phone, check_in_date, check_out_date, adults, status, source, created_by) VALUES
  ('d3000001-0000-4000-8000-000000000003', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'd6000001-0000-4000-8000-000000000002', 'Ravi Kumar',   '9800055566', CURRENT_DATE - INTERVAL '4 days', CURRENT_DATE + INTERVAL '3 days', 1, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2'),
  ('d3000001-0000-4000-8000-000000000004', 'ccbe65f3-bb7b-400c-81b3-af56495b6a08', 'd6000001-0000-4000-8000-000000000003', 'Meena Pillai', '9800077788', CURRENT_DATE - INTERVAL '1 days', CURRENT_DATE + INTERVAL '6 days', 2, 'CHECKED_IN', 'DIRECT', '640e1946-5ffe-41cb-8be5-8ba499c08bd2')
ON CONFLICT DO NOTHING;

INSERT INTO pms_room_reservations (id, reservation_id, room_type_id, rate_plan_id, room_id, room_number, rate_per_night, actual_check_in_at) VALUES
  ('d4000001-0000-4000-8000-000000000003', 'd3000001-0000-4000-8000-000000000003', 'd1000001-0000-4000-8000-000000000002', 'd2000001-0000-4000-8000-000000000002', 'ede7723a-93e0-4fbc-b6f3-6909dd559613', '201', 5500.00, NOW() - INTERVAL '4 days'),
  ('d4000001-0000-4000-8000-000000000004', 'd3000001-0000-4000-8000-000000000004', 'd1000001-0000-4000-8000-000000000003', 'd2000001-0000-4000-8000-000000000003', 'faa9e33d-3d94-486a-b099-3af0c3ba8d5d', '301', 9000.00, NOW() - INTERVAL '1 days')
ON CONFLICT DO NOTHING;

-- Also refresh room_reservations.actual_check_in_at for Anjali's existing
-- room_reservation row, same reasoning as the check_in_date refresh above.
UPDATE pms_room_reservations
SET actual_check_in_at = NOW() - INTERVAL '2 days'
WHERE id = 'd4000001-0000-4000-8000-000000000001';
