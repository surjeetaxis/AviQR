"""Cross-cutting checks that don't belong to one service: missing-token
rejection and cross-tenant isolation (owner A must not touch owner B's data).
"""
from client import get, post, put
from config import SHOP_101, SHOP_102, HOTEL_1


PROTECTED_ENDPOINTS = [
    f"/api/v1/shops/{SHOP_101}",
    f"/api/v1/staff/shop/{SHOP_101}",
    f"/api/v1/orders/shop/{SHOP_101}/live",
    f"/api/v1/payments/shop/{SHOP_101}",
    f"/api/v1/qr-codes/shop/{SHOP_101}",
    f"/api/v1/hotels/{HOTEL_1}",
    f"/api/v1/reports/shop/{SHOP_101}/daily",
    "/api/v1/tickets",
]


def test_protected_endpoints_reject_missing_token():
    for path in PROTECTED_ENDPOINTS:
        r = get(path)
        assert r.status_code == 401, f"{path} should require a token, got {r.status_code}"


def test_protected_endpoints_reject_garbage_token():
    for path in PROTECTED_ENDPOINTS:
        r = get(path, token="not-a-real-jwt")
        assert r.status_code == 401, f"{path} should reject a garbage token, got {r.status_code}"


def test_owner_cannot_update_another_owners_shop(owner, owner2):
    r = put(f"/api/v1/shops/{SHOP_102}", token=owner["accessToken"], json={
        "name": "Hijacked Name", "phone": "9000000000",
    })
    assert r.status_code == 403


def test_owner_cannot_view_another_shops_live_orders(owner):
    r = get(f"/api/v1/orders/shop/{SHOP_102}/live", token=owner["accessToken"])
    assert r.status_code == 403


def test_owner_cannot_view_another_shops_payments(owner):
    r = get(f"/api/v1/payments/shop/{SHOP_102}", token=owner["accessToken"])
    assert r.status_code == 403


def test_restaurant_owner_cannot_manage_someone_elses_hotel(owner, hotel_owner):
    r = put(f"/api/v1/hotels/{HOTEL_1}", token=owner["accessToken"], json={"name": "Hijacked Hotel"})
    assert r.status_code == 403


def test_admin_bypasses_shop_ownership_checks(admin):
    r = get(f"/api/v1/payments/shop/{SHOP_101}", token=admin["accessToken"])
    assert r.status_code == 200


def test_customer_cannot_access_shop_staff_live_orders_view(customer):
    r = get(f"/api/v1/orders/shop/{SHOP_101}/live", token=customer["accessToken"])
    assert r.status_code == 403


def test_customer_cannot_recalculate_seller_tiers(customer):
    r = post("/api/v1/shops/admin/recalculate-tiers", token=customer["accessToken"])
    assert r.status_code == 403


def test_non_admin_cannot_view_platform_wide_payments(owner):
    r = get("/api/v1/payments", token=owner["accessToken"])
    assert r.status_code == 403


def test_non_admin_cannot_list_all_malls(mall_admin):
    # Even the mall's own admin can't list *every* mall cross-tenant — only ADMIN can.
    r = get("/api/v1/malls", token=mall_admin["accessToken"])
    assert r.status_code == 403
