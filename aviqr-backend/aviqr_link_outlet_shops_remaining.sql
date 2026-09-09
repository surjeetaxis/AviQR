-- ==============================================================================
--  aviqr_link_outlet_shops_remaining.sql — ONE-TIME repair for the production
--  aviqr_hotel database, run 2026-09-09.
--
--  Second half of the outlet-shop-linking fix (see
--  aviqr_link_outlet_shops_foodbev.sql for the food/drink outlets and full
--  root-cause explanation). Links the remaining 5 non-F&B outlets to real
--  Shop records already created via the actual POST /api/v1/shops endpoint.
--
--  Run as: sudo -u postgres psql -d aviqr_hotel -f aviqr_link_outlet_shops_remaining.sql
-- ==============================================================================

UPDATE hotel_outlets SET shop_id = '75ac2431-aef7-4af8-998d-3b2d1fdb1b05'
WHERE id = 'b1000001-0000-4000-8000-000000000003'; -- Serenity Spa

UPDATE hotel_outlets SET shop_id = '3ca199c6-df6a-47e2-b186-9b3984daf95c'
WHERE id = 'b1000001-0000-4000-8000-000000000005'; -- Palace Boutique

UPDATE hotel_outlets SET shop_id = '13c9a8ae-97f1-4f5e-8dc8-7213571f8266'
WHERE id = 'b1000001-0000-4000-8000-000000000006'; -- FitZone Gym

UPDATE hotel_outlets SET shop_id = '733f40f1-5932-49a6-baf3-68fe5421fa91'
WHERE id = 'b1000001-0000-4000-8000-000000000007'; -- Heritage Walk & City Tours

UPDATE hotel_outlets SET shop_id = '0cea30ef-b9b5-41a7-91d6-b7adfc8d9a0e'
WHERE id = 'b1000001-0000-4000-8000-000000000008'; -- Grand Ballroom
