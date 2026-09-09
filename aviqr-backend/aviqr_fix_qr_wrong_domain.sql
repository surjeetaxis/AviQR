-- ==============================================================================
--  aviqr_fix_qr_wrong_domain.sql — ONE-TIME repair for the production
--  aviqr_order database, run 2026-09-09.
--
--  Root cause: production's .env had APP_BASE_URL=https://api.aviqr.com (the
--  API domain) instead of https://aviqr.com (the frontend, correctly set as
--  FRONTEND_URL in the same file) — order-qr-service uses APP_BASE_URL to
--  build every QR code's target_url. Every QR generated while that was wrong
--  pointed guests at a 404 on the API domain instead of the real menu/
--  guest-services page. Already fixed: .env corrected and order-qr-service
--  restarted (blue-green, zero-downtime) — this only repairs the handful of
--  qr_codes rows that were created with the wrong domain baked in before
--  the restart (all from tonight's testing; verified via
--  target_url LIKE 'https://api.aviqr.com%' that no older/real-guest QR
--  codes were affected).
--
--  Safe to re-run: WHERE clause only matches rows still on the wrong domain.
--
--  Run as: sudo -u postgres psql -d aviqr_order -f aviqr_fix_qr_wrong_domain.sql
-- ==============================================================================

UPDATE qr_codes
SET target_url = regexp_replace(target_url, '^https://api\.aviqr\.com', 'https://aviqr.com')
WHERE target_url LIKE 'https://api.aviqr.com%';
