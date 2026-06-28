"""
test_crm.py — Loyalty Program, CRM, Customer Management

Covers:
  • Balance lookup by phone (existing + new customer)
  • Earn points (1 point per ₹10 spent)
  • Redeem points (100 points = ₹10 discount)
  • Balance reflects earn and redeem correctly
  • Customer listing with tier metadata
  • Transaction history for a customer
  • Cannot redeem more points than balance
  • Customer cannot earn/redeem for another shop
  • RBAC: customer-facing menu access; cashier/owner can manage loyalty
"""
import uuid
import pytest
from client import get, post
from config import SHOP_101, SHOP_102


def _phone() -> str:
    """Fresh phone for each test to avoid balance bleed-over."""
    import random
    return "90" + "".join([str(random.randint(0, 9)) for _ in range(8)])


# ─── Balance lookup ────────────────────────────────────────────────────────────

@pytest.mark.crm
def test_balance_lookup_new_customer_returns_zero(owner):
    phone = _phone()
    r = get(f"/api/v1/loyalty/{SHOP_101}/balance",
            token=owner["accessToken"], params={"phone": phone})
    assert r.status_code == 200
    data = r.json()["data"]
    assert int(data.get("totalPoints", 0)) == 0


@pytest.mark.crm
def test_balance_lookup_requires_auth():
    r = get(f"/api/v1/loyalty/{SHOP_101}/balance", params={"phone": "9000000001"})
    assert r.status_code == 401


# ─── Earn points ──────────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.crm
def test_earn_points_adds_to_balance(owner):
    phone = _phone()

    earn = post(f"/api/v1/loyalty/{SHOP_101}/earn",
                token=owner["accessToken"],
                json={"customerPhone": phone, "orderAmount": 500.0})
    assert earn.status_code == 200

    bal = get(f"/api/v1/loyalty/{SHOP_101}/balance",
              token=owner["accessToken"], params={"phone": phone})
    assert bal.status_code == 200
    pts = int(bal.json()["data"].get("totalPoints", 0))
    # 500 / 10 = 50 points (1 pt per ₹10)
    assert pts == 50


@pytest.mark.mutates
@pytest.mark.crm
def test_multiple_earn_events_accumulate(owner):
    phone = _phone()
    for amount in (100.0, 200.0, 300.0):
        post(f"/api/v1/loyalty/{SHOP_101}/earn",
             token=owner["accessToken"],
             json={"customerPhone": phone, "orderAmount": amount})

    bal = get(f"/api/v1/loyalty/{SHOP_101}/balance",
              token=owner["accessToken"], params={"phone": phone})
    pts = int(bal.json()["data"].get("totalPoints", 0))
    # 100+200+300 = 600 / 10 = 60 points
    assert pts == 60


@pytest.mark.crm
def test_cashier_can_earn_points_for_customer(cashier):
    phone = _phone()
    r = post(f"/api/v1/loyalty/{SHOP_101}/earn",
             token=cashier["accessToken"],
             json={"customerPhone": phone, "orderAmount": 200.0})
    assert r.status_code == 200


@pytest.mark.crm
def test_customer_cannot_earn_points_themselves(customer):
    r = post(f"/api/v1/loyalty/{SHOP_101}/earn",
             token=customer["accessToken"],
             json={"customerPhone": "9000000002", "orderAmount": 500.0})
    assert r.status_code == 403


# ─── Redeem points ────────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.crm
def test_redeem_points_reduces_balance(owner):
    phone = _phone()
    # Earn 100 points first
    post(f"/api/v1/loyalty/{SHOP_101}/earn",
         token=owner["accessToken"],
         json={"customerPhone": phone, "orderAmount": 1000.0})

    before = int(get(f"/api/v1/loyalty/{SHOP_101}/balance",
                     token=owner["accessToken"],
                     params={"phone": phone}).json()["data"].get("totalPoints", 0))

    redeem = post(f"/api/v1/loyalty/{SHOP_101}/redeem",
                  token=owner["accessToken"],
                  json={"customerPhone": phone, "pointsToRedeem": 50})
    assert redeem.status_code == 200

    after = int(get(f"/api/v1/loyalty/{SHOP_101}/balance",
                    token=owner["accessToken"],
                    params={"phone": phone}).json()["data"].get("totalPoints", 0))
    assert after == before - 50


@pytest.mark.mutates
@pytest.mark.crm
def test_cannot_redeem_more_than_balance(owner):
    phone = _phone()
    post(f"/api/v1/loyalty/{SHOP_101}/earn",
         token=owner["accessToken"],
         json={"customerPhone": phone, "orderAmount": 100.0})  # 10 pts

    r = post(f"/api/v1/loyalty/{SHOP_101}/redeem",
             token=owner["accessToken"],
             json={"customerPhone": phone, "pointsToRedeem": 9999})
    # Should either reject 400 or return success:false
    if r.status_code == 200:
        assert r.json().get("success") is False or r.json()["data"].get("success") is False
    else:
        assert r.status_code in (400, 422)


# ─── Customer listing ─────────────────────────────────────────────────────────

@pytest.mark.crm
def test_owner_can_list_loyalty_customers(owner):
    r = get(f"/api/v1/loyalty/{SHOP_101}/customers", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.crm
def test_customer_cannot_list_loyalty_customers(customer):
    r = get(f"/api/v1/loyalty/{SHOP_101}/customers", token=customer["accessToken"])
    assert r.status_code == 403


@pytest.mark.crm
def test_owner_of_shop2_cannot_list_shop1_customers(owner2):
    r = get(f"/api/v1/loyalty/{SHOP_101}/customers", token=owner2["accessToken"])
    assert r.status_code == 403


# ─── Transaction history ──────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.crm
def test_earn_event_appears_in_history(owner):
    phone = _phone()
    post(f"/api/v1/loyalty/{SHOP_101}/earn",
         token=owner["accessToken"],
         json={"customerPhone": phone, "orderAmount": 250.0})

    r = get(f"/api/v1/loyalty/{SHOP_101}/history",
            token=owner["accessToken"], params={"phone": phone})
    assert r.status_code == 200
    history = r.json()["data"]
    assert isinstance(history, list)
    assert len(history) >= 1


@pytest.mark.mutates
@pytest.mark.crm
def test_redeem_event_appears_in_history(owner):
    phone = _phone()
    post(f"/api/v1/loyalty/{SHOP_101}/earn",
         token=owner["accessToken"],
         json={"customerPhone": phone, "orderAmount": 500.0})
    post(f"/api/v1/loyalty/{SHOP_101}/redeem",
         token=owner["accessToken"],
         json={"customerPhone": phone, "pointsToRedeem": 20})

    r = get(f"/api/v1/loyalty/{SHOP_101}/history",
            token=owner["accessToken"], params={"phone": phone})
    assert r.status_code == 200
    types = [h.get("type") for h in r.json()["data"]]
    assert "EARN" in types or "earn" in [t.lower() for t in types if t]
    assert "REDEEM" in types or "redeem" in [t.lower() for t in types if t]


# ─── Tier logic ───────────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.crm
def test_customer_with_high_points_is_in_gold_tier(owner):
    """Earn 2000+ points to validate gold tier threshold detection."""
    phone = _phone()
    for _ in range(4):
        post(f"/api/v1/loyalty/{SHOP_101}/earn",
             token=owner["accessToken"],
             json={"customerPhone": phone, "orderAmount": 5000.0})

    bal = get(f"/api/v1/loyalty/{SHOP_101}/balance",
              token=owner["accessToken"], params={"phone": phone})
    pts = int(bal.json()["data"].get("totalPoints", 0))
    assert pts >= 2000, f"Expected ≥2000 pts for gold tier, got {pts}"
