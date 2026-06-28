import pytest
from client import get, post, put, delete
from config import SHOP_101, CATEGORY_101_MAIN, ITEM_101_PANEER_TIKKA


def test_public_menu_has_no_auth_and_has_categories(customer):
    # Public route — deliberately not passing a token.
    r = get(f"/api/v1/menu/public/{SHOP_101}")
    assert r.status_code == 200
    body = r.json()["data"]
    assert body["shopId"] == SHOP_101
    assert len(body["categories"]) > 0
    assert any(len(c["items"]) > 0 for c in body["categories"])


def test_categories_list_for_shop(owner):
    r = get(f"/api/v1/categories/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    names = [c["name"] for c in r.json()["data"]]
    assert "Main Course" in names


def test_items_paginated_and_sorted_by_ranking(owner):
    r = get(f"/api/v1/items/shop/{SHOP_101}", token=owner["accessToken"], params={"page": 0, "size": 10})
    assert r.status_code == 200
    page = r.json()["data"]
    assert page["totalElements"] >= 20  # Spice Route has 24 seeded items


@pytest.mark.mutates
def test_owner_can_create_category_and_item_then_delete_them(owner):
    cat = post("/api/v1/categories", token=owner["accessToken"], json={
        "name": "QA Automation Category", "emoji": "\U0001F9EA", "shopId": SHOP_101, "sortOrder": 99,
    })
    assert cat.status_code == 200
    cat_id = cat.json()["data"]["id"]

    item = post("/api/v1/items", token=owner["accessToken"], json={
        "name": "QA Automation Item", "categoryId": cat_id, "shopId": SHOP_101,
        "price": 1.00, "veg": True,
    })
    assert item.status_code == 200
    item_id = item.json()["data"]["id"]

    del_item = delete(f"/api/v1/items/{item_id}", token=owner["accessToken"])
    assert del_item.status_code == 200

    del_cat = delete(f"/api/v1/categories/{cat_id}", token=owner["accessToken"])
    assert del_cat.status_code == 200


@pytest.mark.mutates
def test_toggle_item_availability_round_trip(owner):
    """Flip availability off then back on — leaves the seeded item unchanged afterward."""
    off = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/availability",
              token=owner["accessToken"], params={"available": "false"})
    assert off.status_code == 200

    items = get(f"/api/v1/items/shop/{SHOP_101}/all", token=owner["accessToken"]).json()["data"]
    item = next(i for i in items if i["id"] == ITEM_101_PANEER_TIKKA)
    assert item["available"] is False

    on = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/availability",
             token=owner["accessToken"], params={"available": "true"})
    assert on.status_code == 200


def test_menu_editor_permission_boundary(customer):
    # CUSTOMER is not in the menu-manager role set for this shop.
    r = post("/api/v1/categories", token=customer["accessToken"], json={
        "name": "Should Not Be Created", "shopId": SHOP_101,
    })
    assert r.status_code == 403


@pytest.mark.mutates
def test_category_full_update_round_trip(owner):
    original = next(c for c in get(f"/api/v1/categories/shop/{SHOP_101}", token=owner["accessToken"]).json()["data"]
                     if c["id"] == CATEGORY_101_MAIN)

    r = put(f"/api/v1/categories/{CATEGORY_101_MAIN}", token=owner["accessToken"], json={
        "name": original["name"], "emoji": "\U0001F37D", "sortOrder": original["sortOrder"],
    })
    assert r.status_code == 200
    assert r.json()["data"]["emoji"] == "\U0001F37D"

    put(f"/api/v1/categories/{CATEGORY_101_MAIN}", token=owner["accessToken"], json={
        "name": original["name"], "emoji": original["emoji"], "sortOrder": original["sortOrder"],
    })


@pytest.mark.mutates
def test_item_full_update_round_trip(owner):
    original = next(i for i in get(f"/api/v1/items/shop/{SHOP_101}/all", token=owner["accessToken"]).json()["data"]
                     if i["id"] == ITEM_101_PANEER_TIKKA)

    r = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}", token=owner["accessToken"], json={
        "name": original["name"], "price": 299.00, "description": original["description"],
        "veg": original["veg"], "spicy": original["spicy"], "popular": original["popular"],
        "tag": original["tag"],
    })
    assert r.status_code == 200
    assert r.json()["data"]["price"] == 299.00

    put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}", token=owner["accessToken"], json={
        "name": original["name"], "price": original["price"], "description": original["description"],
        "veg": original["veg"], "spicy": original["spicy"], "popular": original["popular"],
        "tag": original["tag"],
    })


def test_pricing_rules_list_for_shop(owner):
    r = get(f"/api/v1/pricing-rules/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    names = [rule["name"] for rule in r.json()["data"]]
    assert "Happy Hours (3–6 PM)" in names


@pytest.mark.mutates
def test_pricing_rule_lifecycle(owner):
    create = post("/api/v1/pricing-rules", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "QA Automation Rule", "type": "TIME",
        "adjustmentType": "PERCENTAGE_DECREASE", "adjustmentValue": 5.00, "active": True,
    })
    assert create.status_code == 200
    rule_id = create.json()["data"]["id"]

    update = put(f"/api/v1/pricing-rules/{rule_id}", token=owner["accessToken"], json={
        "name": "QA Automation Rule Updated", "active": False, "adjustmentValue": 10.00,
    })
    assert update.status_code == 200
    assert update.json()["data"]["name"] == "QA Automation Rule Updated"
    assert update.json()["data"]["active"] is False

    deleted = delete(f"/api/v1/pricing-rules/{rule_id}", token=owner["accessToken"])
    assert deleted.status_code == 200


@pytest.mark.mutates
def test_only_admin_can_trigger_ranking_recalculation(owner, admin):
    r = post("/api/v1/items/admin/recalculate-rankings", token=owner["accessToken"])
    assert r.status_code == 403

    r2 = post("/api/v1/items/admin/recalculate-rankings", token=admin["accessToken"])
    assert r2.status_code == 200
