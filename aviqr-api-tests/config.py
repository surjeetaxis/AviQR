import os

# Everything goes through the api-gateway — it's the only entry point the
# real apps use too (JWT validation + X-User-Id/X-User-Role/X-Shop-Id
# injection happens there, not in the individual services).
BASE_URL = os.environ.get("AVIQR_BASE_URL", "http://localhost:8080")
EUREKA_URL = os.environ.get("AVIQR_EUREKA_URL", "http://localhost:8761")

# All 15 services registered with Eureka (service-registry itself doesn't
# register with itself, so it's excluded here).
EXPECTED_SERVICES = [
    "API-GATEWAY", "AUTH-SERVICE", "SHOP-SERVICE", "MENU-SERVICE",
    "ORDER-SERVICE", "PAYMENT-SERVICE", "QR-SERVICE", "HOTEL-SERVICE",
    "MALL-SERVICE", "SUPPORT-SERVICE", "NOTIFICATION-SERVICE",
    "REPORT-SERVICE", "OCR-SERVICE", "REVIEW-SERVICE",
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
SHOP_101 = "00000000-0000-0000-0000-000000000101"  # Spice Route
SHOP_102 = "00000000-0000-0000-0000-000000000102"  # The Coconut Grove
SHOP_104 = "00000000-0000-0000-0000-000000000104"  # Cake Studio
CATEGORY_101_MAIN = "00000000-0000-0000-0001-000000000002"  # Spice Route / Main Course
ITEM_101_PANEER_TIKKA = "00000000-0000-0000-0002-000000000001"
ITEM_101_PANEER_TIKKA_PRICE = 280.00
HOTEL_1 = "00000000-0000-0000-0006-000000000001"  # Grand Palace Hotel
ROOM_1_VACANT = "00000000-0000-0000-0007-000000000002"  # room 102, VACANT in seed data
MALL_1 = "00000000-0000-0000-0009-000000000001"  # Forum Mall Bengaluru
QR_CODE_SPICEROUTE = "spiceroute"
