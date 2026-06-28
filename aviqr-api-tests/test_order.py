import pytest
from client import get, post, put
from config import SHOP_101, ITEM_101_PANEER_TIKKA, ITEM_101_PANEER_TIKKA_PRICE


def _place_order(customer_token):
    r = post(f"/api/v1/orders/shop/{SHOP_101}", token=customer_token, json={
        "customerName": "QA Automation Customer",
        "customerPhone": "9123450000",
        "tableNumber": "99",
        "type": "DINE_IN",
        "paymentMethod": "CASH",
        "items": [{
            "menuItemId": ITEM_101_PANEER_TIKKA,
            "itemName": "Paneer Tikka",
            "quantity": 1,
            "unitPrice": ITEM_101_PANEER_TIKKA_PRICE,
        }],
    })
    assert r.status_code == 200, r.text
    return r.json()["data"]


def test_place_order_requires_auth():
    r = post(f"/api/v1/orders/shop/{SHOP_101}", json={
        "customerName": "Anonymous", "paymentMethod": "CASH", "items": [],
    })
    assert r.status_code == 401


@pytest.mark.mutates
def test_customer_places_order_and_can_fetch_it(customer):
    order = _place_order(customer["accessToken"])
    assert order["shopId"] == SHOP_101
    assert order["status"] == "NEW"

    r = get(f"/api/v1/orders/{order['id']}", token=customer["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["id"] == order["id"]


@pytest.mark.mutates
def test_new_order_appears_in_kitchen_live_view(customer, kitchen):
    order = _place_order(customer["accessToken"])

    r = get(f"/api/v1/orders/shop/{SHOP_101}/live", token=kitchen["accessToken"])
    assert r.status_code == 200
    ids = [o["id"] for o in r.json()["data"]]
    assert order["id"] in ids


@pytest.mark.mutates
def test_kitchen_can_progress_order_status(customer, kitchen):
    order = _place_order(customer["accessToken"])

    r = put(f"/api/v1/orders/{order['id']}/status", token=kitchen["accessToken"], params={"status": "PREPARING"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "PREPARING"


@pytest.mark.mutates
def test_customer_can_cancel_their_own_order(customer):
    order = _place_order(customer["accessToken"])

    r = put(f"/api/v1/orders/{order['id']}/status", token=customer["accessToken"], params={"status": "CANCELLED"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "CANCELLED"


@pytest.mark.mutates
def test_customer_cannot_force_a_status_other_than_cancelled(customer):
    order = _place_order(customer["accessToken"])

    r = put(f"/api/v1/orders/{order['id']}/status", token=customer["accessToken"], params={"status": "PREPARING"})
    assert r.status_code == 403


@pytest.mark.mutates
def test_customer_order_history_includes_their_orders(customer):
    order = _place_order(customer["accessToken"])

    r = get("/api/v1/orders/customer/history", token=customer["accessToken"], params={"page": 0, "size": 50})
    assert r.status_code == 200
    ids = [o["id"] for o in r.json()["data"]["content"]]
    assert order["id"] in ids


def test_cashier_can_view_shop_orders_with_pagination(cashier):
    r = get(f"/api/v1/orders/shop/{SHOP_101}", token=cashier["accessToken"], params={"page": 0, "size": 20})
    assert r.status_code == 200
    assert r.json()["data"]["totalElements"] >= 8  # 8 hand-written demo orders for this shop


def test_shop_stats_visible_to_staff_not_customer(owner, customer):
    r = get(f"/api/v1/orders/shop/{SHOP_101}/stats", token=owner["accessToken"])
    assert r.status_code == 200

    r2 = get(f"/api/v1/orders/shop/{SHOP_101}/stats", token=customer["accessToken"])
    assert r2.status_code == 403


def test_item_stats_hidden_from_customer_role(owner, customer):
    r = get(f"/api/v1/orders/item/{ITEM_101_PANEER_TIKKA}/stats", token=owner["accessToken"])
    assert r.status_code == 200

    r2 = get(f"/api/v1/orders/item/{ITEM_101_PANEER_TIKKA}/stats", token=customer["accessToken"])
    assert r2.status_code == 403
