"""
test_menu_variations.py — Menu Variants, Add-ons, Pricing Rules

Covers:
  • Create and list size variants for a menu item (S/M/L, Half/Full)
  • Default variant flag
  • Save entire variant set (replaces previous)
  • Delete all variants for an item
  • Create, list, update, delete shop-wide add-ons
  • Pricing rules CRUD
  • RBAC: owner/manager can manage; customer cannot
  • Cross-tenant: owner cannot manage another shop's add-ons
"""
import uuid
import pytest
from client import get, post, put, delete
from config import SHOP_101, SHOP_102, ITEM_101_PANEER_TIKKA


# ─── Variants ─────────────────────────────────────────────────────────────────

@pytest.mark.mutates
def test_owner_can_save_variants_for_item(owner):
    variants = [
        {"variantName": "Small",  "price": 180.0, "isDefault": False, "sortOrder": 0, "active": True},
        {"variantName": "Medium", "price": 280.0, "isDefault": True,  "sortOrder": 1, "active": True},
        {"variantName": "Large",  "price": 380.0, "isDefault": False, "sortOrder": 2, "active": True},
    ]
    r = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
            token=owner["accessToken"], json=variants)
    assert r.status_code == 200, r.text
    saved = r.json()["data"]
    assert len(saved) == 3
    names = [v["variantName"] for v in saved]
    assert "Small" in names and "Medium" in names and "Large" in names


def test_owner_can_list_variants_for_item(owner):
    r = get(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
            token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.mutates
def test_default_variant_flag_is_preserved(owner):
    variants = [
        {"variantName": "Half",  "price": 140.0, "isDefault": True,  "sortOrder": 0, "active": True},
        {"variantName": "Full",  "price": 260.0, "isDefault": False, "sortOrder": 1, "active": True},
    ]
    r = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
            token=owner["accessToken"], json=variants)
    assert r.status_code == 200
    saved = r.json()["data"]
    defaults = [v for v in saved if v.get("isDefault")]
    assert len(defaults) >= 1
    assert defaults[0]["variantName"] == "Half"


@pytest.mark.mutates
def test_saving_empty_list_deletes_all_variants(owner):
    # First set some variants
    put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
        token=owner["accessToken"],
        json=[{"variantName": "Regular", "price": 280.0, "isDefault": True, "sortOrder": 0, "active": True}])

    # Clear them
    r = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
            token=owner["accessToken"], json=[])
    assert r.status_code == 200
    assert r.json()["data"] == [] or r.json()["data"] is None or len(r.json()["data"]) == 0


@pytest.mark.mutates
def test_delete_variants_endpoint(owner):
    put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
        token=owner["accessToken"],
        json=[{"variantName": "Test", "price": 100.0, "isDefault": True, "sortOrder": 0, "active": True}])

    r = delete(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants", token=owner["accessToken"])
    assert r.status_code == 200


def test_customer_cannot_save_variants(customer):
    r = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants",
            token=customer["accessToken"],
            json=[{"variantName": "Hacked", "price": 1.0, "isDefault": True, "sortOrder": 0}])
    assert r.status_code == 403


def test_variant_endpoint_requires_auth():
    r = get(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/variants")
    assert r.status_code == 401


# ─── Add-ons ──────────────────────────────────────────────────────────────────

@pytest.mark.mutates
def test_owner_can_create_addon(owner):
    uid = uuid.uuid4().hex[:6]
    r = post("/api/v1/addons", token=owner["accessToken"], json={
        "shopId":  SHOP_101,
        "name":    f"QA Extra Cheese {uid}",
        "price":   30.0,
        "veg":     True,
        "active":  True,
    })
    assert r.status_code == 200, r.text
    addon = r.json()["data"]
    assert addon["shopId"] == SHOP_101
    assert float(addon["price"]) == 30.0
    return addon["id"]


def test_owner_can_list_addons_for_shop(owner):
    r = get(f"/api/v1/addons/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.mutates
def test_addon_update_changes_price(owner):
    uid = uuid.uuid4().hex[:6]
    created = post("/api/v1/addons", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": f"QA Update Addon {uid}", "price": 20.0, "veg": True, "active": True,
    })
    assert created.status_code == 200
    addon_id = created.json()["data"]["id"]

    updated = put(f"/api/v1/addons/{addon_id}", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": f"QA Update Addon {uid}", "price": 40.0, "veg": True, "active": True,
    })
    assert updated.status_code == 200
    assert float(updated.json()["data"]["price"]) == 40.0


@pytest.mark.mutates
def test_addon_delete(owner):
    uid = uuid.uuid4().hex[:6]
    created = post("/api/v1/addons", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": f"QA Delete Addon {uid}", "price": 10.0, "veg": False, "active": True,
    })
    addon_id = created.json()["data"]["id"]
    r = delete(f"/api/v1/addons/{addon_id}", token=owner["accessToken"])
    assert r.status_code == 200


def test_customer_cannot_create_addon(customer):
    r = post("/api/v1/addons", token=customer["accessToken"], json={
        "shopId": SHOP_101, "name": "Hacked Addon", "price": 0.01, "veg": True, "active": True,
    })
    assert r.status_code == 403


def test_addon_list_requires_auth():
    r = get(f"/api/v1/addons/shop/{SHOP_101}")
    assert r.status_code == 401


def test_owner2_cannot_list_shop1_addons(owner2):
    r = get(f"/api/v1/addons/shop/{SHOP_101}", token=owner2["accessToken"])
    assert r.status_code == 403


# ─── Pricing rules ────────────────────────────────────────────────────────────

def test_owner_can_list_pricing_rules(owner):
    r = get(f"/api/v1/pricing-rules/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.mutates
def test_create_and_delete_pricing_rule(owner):
    r = post("/api/v1/pricing-rules", token=owner["accessToken"], json={
        "shopId":     SHOP_101,
        "name":       "QA Weekend Surge",
        "ruleType":   "TIME_BASED",
        "adjustment": 10.0,
        "dayOfWeek":  "SATURDAY",
        "startTime":  "18:00",
        "endTime":    "22:00",
        "active":     True,
    })
    assert r.status_code == 200
    rule_id = r.json()["data"]["id"]

    d = delete(f"/api/v1/pricing-rules/{rule_id}", token=owner["accessToken"])
    assert d.status_code == 200


def test_customer_cannot_create_pricing_rule(customer):
    r = post("/api/v1/pricing-rules", token=customer["accessToken"], json={
        "shopId": SHOP_101, "name": "Hack Rule", "ruleType": "TIME_BASED",
        "adjustment": 100.0, "active": True,
    })
    assert r.status_code == 403
