"""
test_security.py — Security, RBAC, Cross-Tenant Isolation, Input Validation

Covers every security boundary in the QA_VERIFICATION_REPORT:
  • All protected endpoints reject missing or garbage JWT
  • Role escalation prevention (CUSTOMER cannot become ADMIN)
  • Cross-tenant isolation — owner A cannot touch owner B's data
  • Privilege escalation via admin endpoints
  • SQL injection and XSS in text fields are handled safely
  • Oversized payloads do not cause 500s
  • Boundary values (empty strings, null, extreme numbers)
"""
import uuid
import pytest
from client import get, post, put, delete
from config import (
    SHOP_101, SHOP_102, HOTEL_1, MALL_1,
    ITEM_101_PANEER_TIKKA, ITEM_101_PANEER_TIKKA_PRICE
)


# ─── Every protected endpoint rejects no-token ────────────────────────────────

PROTECTED_ENDPOINTS = [
    ("GET",  f"/api/v1/shops/{SHOP_101}"),
    ("GET",  f"/api/v1/staff/shop/{SHOP_101}"),
    ("GET",  f"/api/v1/orders/shop/{SHOP_101}/live"),
    ("GET",  f"/api/v1/payments/shop/{SHOP_101}"),
    ("GET",  f"/api/v1/qr-codes/shop/{SHOP_101}"),
    ("GET",  f"/api/v1/hotels/{HOTEL_1}"),
    ("GET",  f"/api/v1/reports/shop/{SHOP_101}/daily"),
    ("GET",  "/api/v1/tickets"),
    ("GET",  f"/api/v1/inventory/shop/{SHOP_101}"),
    ("GET",  f"/api/v1/loyalty/{SHOP_101}/customers"),
    ("GET",  f"/api/v1/raw-materials/shop/{SHOP_101}"),
    ("GET",  f"/api/v1/addons/shop/{SHOP_101}"),
    ("GET",  f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/recipe"),
    ("GET",  f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants"),
]

PUBLIC_ENDPOINTS = [
    ("GET",  f"/api/v1/menu/public/{SHOP_101}"),
    ("GET",  f"/api/v1/malls/public/{MALL_1}/vendors"),
    ("POST", "/api/v1/aggregator/zomato/webhook"),
    ("POST", "/api/v1/aggregator/swiggy/webhook"),
]


@pytest.mark.security
def test_protected_endpoints_reject_missing_token():
    for method, path in PROTECTED_ENDPOINTS:
        fn = get if method == "GET" else post
        r = fn(path)
        assert r.status_code == 401, f"{method} {path} → expected 401, got {r.status_code}"


@pytest.mark.security
def test_protected_endpoints_reject_garbage_token():
    for method, path in PROTECTED_ENDPOINTS:
        fn = get if method == "GET" else post
        r = fn(path, token="this.is.not.a.valid.jwt.at.all")
        assert r.status_code == 401, f"{method} {path} → expected 401 on garbage token, got {r.status_code}"


@pytest.mark.security
def test_public_endpoints_do_not_require_auth():
    for method, path in PUBLIC_ENDPOINTS:
        fn = get if method == "GET" else (lambda p, **kw: post(p, **kw))
        r = fn(path)
        assert r.status_code != 401, f"{method} {path} → should be public, got 401"


# ─── Role escalation prevention ───────────────────────────────────────────────

@pytest.mark.security
def test_customer_cannot_escalate_own_role_to_admin(customer, admin):
    r = put(f"/api/v1/auth/admin/users/{customer['userId']}/role",
            token=customer["accessToken"], params={"role": "ADMIN"})
    assert r.status_code == 403


@pytest.mark.security
def test_support_cannot_change_user_roles(support, customer):
    r = put(f"/api/v1/auth/admin/users/{customer['userId']}/role",
            token=support["accessToken"], params={"role": "ADMIN"})
    assert r.status_code == 403


@pytest.mark.security
def test_owner_cannot_access_admin_user_list(owner):
    r = get("/api/v1/auth/admin/users", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_kitchen_staff_cannot_access_admin_endpoints(kitchen):
    r = get("/api/v1/auth/admin/users", token=kitchen["accessToken"])
    assert r.status_code == 403


# ─── Cross-tenant isolation ───────────────────────────────────────────────────

@pytest.mark.security
def test_owner1_cannot_edit_owner2_shop(owner, owner2):
    r = put(f"/api/v1/shops/{SHOP_102}", token=owner["accessToken"],
            json={"name": "HIJACKED", "phone": "9000000000"})
    assert r.status_code == 403


@pytest.mark.security
def test_owner1_cannot_view_owner2_live_orders(owner):
    r = get(f"/api/v1/orders/shop/{SHOP_102}/live", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_owner1_cannot_view_owner2_payments(owner):
    r = get(f"/api/v1/payments/shop/{SHOP_102}", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_owner1_cannot_create_qr_for_owner2_shop(owner):
    r = post(f"/api/v1/qr-codes/shop/{SHOP_102}", token=owner["accessToken"],
             params={"label": "Hijack QR", "type": "SHOP"})
    assert r.status_code == 403


@pytest.mark.security
def test_owner1_cannot_manage_owner2_inventory(owner):
    r = get(f"/api/v1/inventory/shop/{SHOP_102}", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_owner1_cannot_view_owner2_loyalty_customers(owner):
    r = get(f"/api/v1/loyalty/{SHOP_102}/customers", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_owner1_cannot_access_owner2_raw_materials(owner):
    r = get(f"/api/v1/raw-materials/shop/{SHOP_102}", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_restaurant_owner_cannot_manage_hotel(owner):
    r = put(f"/api/v1/hotels/{HOTEL_1}", token=owner["accessToken"],
            json={"name": "HIJACKED HOTEL"})
    assert r.status_code == 403


@pytest.mark.security
def test_restaurant_owner_cannot_add_mall_vendor(owner):
    r = post("/api/v1/vendors", token=owner["accessToken"],
             json={"mallId": MALL_1, "name": "HIJACKED VENDOR", "category": "Test"})
    assert r.status_code == 403


@pytest.mark.security
def test_admin_can_bypass_shop_ownership(admin):
    """Admin is the only role that should bypass tenant isolation."""
    r = get(f"/api/v1/payments/shop/{SHOP_101}", token=admin["accessToken"])
    assert r.status_code == 200


@pytest.mark.security
def test_customer_cannot_view_staff_list(customer):
    r = get(f"/api/v1/staff/shop/{SHOP_101}", token=customer["accessToken"])
    assert r.status_code == 403


@pytest.mark.security
def test_customer_cannot_set_shop_status(customer):
    r = put(f"/api/v1/shops/{SHOP_101}/status",
            token=customer["accessToken"], params={"status": "SUSPENDED"})
    assert r.status_code == 403


@pytest.mark.security
def test_non_admin_cannot_view_platform_payments(owner, cashier, customer):
    for caller in (owner, cashier, customer):
        r = get("/api/v1/payments", token=caller["accessToken"])
        assert r.status_code == 403, f"Expected 403 for role, got {r.status_code}"


@pytest.mark.security
def test_non_admin_cannot_recalculate_tiers(customer, owner):
    for caller in (customer, owner):
        r = post("/api/v1/shops/admin/recalculate-tiers", token=caller["accessToken"])
        assert r.status_code == 403


# ─── Input validation ─────────────────────────────────────────────────────────

@pytest.mark.security
def test_login_with_sql_injection_returns_400_not_500():
    r = post("/api/v1/auth/login", json={
        "email": "' OR 1=1; --", "password": "anything"
    })
    assert r.status_code in (400, 422), f"Expected 4xx on SQL injection, got {r.status_code}"
    assert r.status_code != 500


@pytest.mark.security
def test_register_with_invalid_email_format_rejected():
    r = post("/api/v1/auth/register", json={
        "name": "Test", "email": "not-an-email", "phone": "9900000001",
        "password": "Axis321#", "role": "CUSTOMER",
    })
    assert r.status_code in (400, 422)


@pytest.mark.security
def test_register_with_weak_password_may_be_rejected():
    r = post("/api/v1/auth/register", json={
        "name": "Test", "email": f"qa-weak-{uuid.uuid4().hex[:6]}@test.com",
        "phone": "9900000002", "password": "abc", "role": "CUSTOMER",
    })
    # Either rejected as weak or accepted — must not 500
    assert r.status_code != 500


@pytest.mark.security
def test_order_with_negative_price_rejected(customer):
    r = post(f"/api/v1/orders/shop/{SHOP_101}", token=customer["accessToken"], json={
        "customerName": "QA", "paymentMethod": "CASH", "type": "DINE_IN",
        "items": [{"menuItemId": ITEM_101_PANEER_TIKKA, "itemName": "Paneer Tikka",
                   "quantity": 1, "unitPrice": -999.0}],
        "subtotal": -999.0, "tax": 0, "totalAmount": -999.0,
    })
    assert r.status_code in (400, 422), f"Negative price should be rejected, got {r.status_code}"


@pytest.mark.security
def test_order_with_zero_items_rejected(customer):
    r = post(f"/api/v1/orders/shop/{SHOP_101}", token=customer["accessToken"], json={
        "customerName": "QA", "paymentMethod": "CASH", "type": "DINE_IN",
        "items": [], "subtotal": 0, "tax": 0, "totalAmount": 0,
    })
    assert r.status_code in (400, 422)


@pytest.mark.security
def test_rating_above_5_is_rejected(customer):
    r = post("/api/v1/reviews", token=customer["accessToken"], json={
        "shopId": SHOP_101, "customerName": "QA", "rating": 10,
    })
    assert r.status_code in (400, 422)


@pytest.mark.security
def test_xss_in_shop_name_stored_safely(owner):
    r = put(f"/api/v1/shops/{SHOP_101}", token=owner["accessToken"], json={
        "name": "<script>alert('xss')</script>",
        "phone": "9000000000",
    })
    # Must not return 500; XSS string stored or rejected
    assert r.status_code != 500

    # Restore
    put(f"/api/v1/shops/{SHOP_101}", token=owner["accessToken"], json={
        "name": "Spice Route", "phone": "9000000000",
    })


@pytest.mark.security
def test_extremely_long_string_does_not_crash_server(owner):
    long_name = "A" * 10_000
    r = put(f"/api/v1/shops/{SHOP_101}", token=owner["accessToken"], json={
        "name": long_name, "phone": "9000000000",
    })
    assert r.status_code in (400, 422, 200), f"Long string caused {r.status_code}"
    assert r.status_code != 500

    # Restore
    put(f"/api/v1/shops/{SHOP_101}", token=owner["accessToken"], json={
        "name": "Spice Route", "phone": "9000000000",
    })


@pytest.mark.security
def test_uuid_manipulation_returns_404_not_500(owner):
    fake_id = str(uuid.uuid4())
    r = get(f"/api/v1/orders/{fake_id}", token=owner["accessToken"])
    assert r.status_code in (404, 403), f"Fake UUID returned {r.status_code}"
    assert r.status_code != 500
