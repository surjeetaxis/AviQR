-- ==============================================================================
--  aviqr_link_outlet_shops_foodbev.sql — ONE-TIME repair for the production
--  aviqr_hotel database, run 2026-09-09.
--
--  Root cause: aviqr_setup.sql only ever linked a real shop to the Zodiac
--  restaurant outlet ("no separate outlet-shop-provisioning needed for demo
--  data" per its own comment) — the other 7 outlets were seeded with
--  shop_id = NULL. That breaks "Manage" (silently renders an empty
--  dashboard — separately fixed in OutletContext.jsx) and, more importantly,
--  breaks Room Service QR generation entirely for those outlets, since
--  HotelOutletController.createRoomServiceQrCode requires a linked shop.
--
--  This links the two FOOD/BEVERAGE outlets first (Cellar Bar, Infinity
--  Pool & Poolside Grill) to real Shop records already created via the
--  actual POST /api/v1/shops endpoint (not raw-inserted) — see the curl
--  calls run against the production gateway immediately before this script.
--  The remaining 5 non-F&B outlets are handled in a follow-up script.
--
--  Run as: sudo -u postgres psql -d aviqr_hotel -f aviqr_link_outlet_shops_foodbev.sql
-- ==============================================================================

UPDATE hotel_outlets SET shop_id = 'c54404ba-64dc-479e-a86b-b0f188b726a2'
WHERE id = 'b1000001-0000-4000-8000-000000000002'; -- The Cellar Bar

UPDATE hotel_outlets SET shop_id = '7b67cb7b-05f4-4cbc-8ab5-29a3631426ba'
WHERE id = 'b1000001-0000-4000-8000-000000000004'; -- Infinity Pool & Poolside Grill
