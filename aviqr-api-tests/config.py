import os

# Everything goes through the api-gateway — it's the only entry point the
# real apps use too (JWT validation + X-User-Id/X-User-Role/X-Shop-Id
# injection happens there, not in the individual services).
BASE_URL = os.environ.get("AVIQR_BASE_URL", "http://localhost:8080")
EUREKA_URL = os.environ.get("AVIQR_EUREKA_URL", "http://localhost:8761")

# All 10 services registered with Eureka (service-registry itself doesn't
# register with itself, so it's excluded here). The fleet was consolidated
# from 15 to 10 — each merged service still answers the same API paths, just
# via a combined app: shop-service+mall-service -> SHOP-MALL-SERVICE,
# menu-service+ocr-service -> MENU-OCR-SERVICE, order-service+qr-service ->
# ORDER-QR-SERVICE, notification-service+report-service+review-service ->
# NOTIFICATION-REPORT-REVIEW-SERVICE.
EXPECTED_SERVICES = [
    "API-GATEWAY", "AUTH-SERVICE", "SHOP-MALL-SERVICE", "MENU-OCR-SERVICE",
    "ORDER-QR-SERVICE", "PAYMENT-SERVICE", "HOTEL-SERVICE",
    "SUPPORT-SERVICE", "NOTIFICATION-REPORT-REVIEW-SERVICE",
]

# Seeded by aviqr_setup.sql — every dev password is Axis321#. One login per
# user type the platform supports, so "all user types" means these 12.
SEED_USERS = {
    "ADMIN":    {"email": "admin@aviqr.in",        "password": "Axis321#"},
    "SUPPORT":  {"email": "support@aviqr.in",       "password": "Axis321#"},
    "OWNER":    {"email": "sujeet@spiceroute.in",   "password": "Axis321#"},  # owns SHOP_101
    "OWNER2":   {"email": "meena@coconut.in",       "password": "Axis321#"},  # owns SHOP_102
    "OWNER3":   {"email": "priya@cake.in",          "password": "Axis321#"},  # owns SHOP_104
    "MANAGER":  {"email": "vikram@gmail.com",       "password": "Axis321#"},  # staff at SHOP_101
    "KITCHEN":  {"email": "kitchen@spiceroute.in",  "password": "Axis321#"},  # staff at SHOP_101
    "CASHIER":  {"email": "cashier@spiceroute.in",  "password": "Axis321#"},  # staff at SHOP_101
    "CUSTOMER": {"email": "anjali@gmail.com",       "password": "Axis321#"},
    "HOTEL":    {"email": "gm@grandpalace.in",      "password": "Axis321#"},  # owns HOTEL_1
    "MALL":     {"email": "admin@forum.in",         "password": "Axis321#"},  # admins MALL_1
    "SUPPLIER": {"email": "ramesh@teas.in",         "password": "Axis321#"},
}

SUSPENDED_USER = {"email": "farhan@biryani.in", "password": "Axis321#"}

# Known dummy-data IDs from aviqr_setup.sql.
# NOTE: aviqr_setup.sql switched from deterministic 00000000-...-NNN IDs to
# gen_random_uuid()/hand-picked real UUIDs at some point; these constants are
# re-read from the live seeded DB, not hand-derived, to stay in sync.
SHOP_101 = "ecdbc557-91fa-44ee-992f-03683ad8bbde"  # Spice Route
SHOP_102 = "44aeca17-767e-410b-868f-9fdd593fa091"  # The Coconut Grove
SHOP_104 = "67685266-6b45-4e40-851c-8277ef650ca3"  # Cake Studio
CATEGORY_101_MAIN = "be8bc0ff-c579-4620-974c-b4970e5daf6c"  # Spice Route / Main Course
ITEM_101_PANEER_TIKKA = "a9ab05b0-202c-4188-a0de-1ac8fb85f91b"
ITEM_101_PANEER_TIKKA_PRICE = 280.00
HOTEL_1 = "ccbe65f3-bb7b-400c-81b3-af56495b6a08"  # Grand Palace Hotel
ROOM_1_VACANT = "c581c211-34b7-49c4-87aa-30c5f82ecd6f"  # room 102, VACANT in seed data
MALL_1 = "f35f1a27-5632-43fe-aa8d-1db992097e4e"  # Forum Mall Bengaluru
QR_CODE_SPICEROUTE = "spiceroute"

# hotel_outlets under Grand Palace Hotel (HOTEL_1)
OUTLET_ZODIAC_RESTAURANT = "b1000001-0000-4000-8000-000000000001"  # RESTAURANT, has shop_id
OUTLET_CELLAR_BAR = "b1000001-0000-4000-8000-000000000002"  # BAR, no shop_id
OUTLET_SERENITY_SPA = "b1000001-0000-4000-8000-000000000003"  # SPA, bookable, has a seeded booking

# vendors under Forum Mall Bengaluru (MALL_1)
VENDOR_SPICE_ROUTE = "6efd1a31-ee35-447e-a2d2-d533ddbe272b"  # has shop_id (== SHOP_101)
VENDOR_WOK_TO_WALK = "118c94a4-2206-4f79-84db-2643a9a4c77b"  # no shop_id
