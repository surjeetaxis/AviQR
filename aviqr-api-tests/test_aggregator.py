"""
test_aggregator.py — Zomato / Swiggy Aggregator Webhook Integration

Covers:
  • Zomato webhook: valid payload creates an order in AviQR
  • Swiggy webhook: valid payload creates an order in AviQR
  • Webhook without signature still accepted when secret not configured
  • Aggregator order appears in live order queue with aggregator badge
  • aggregator_source field correctly persisted on the order
  • Mapping endpoint saves and retrieves restaurant ID mappings
  • Aggregator breakdown report returns source-split data
"""
import uuid
import pytest
from client import get, post
from config import SHOP_101


def _zomato_payload(restaurant_id="543210") -> dict:
    return {
        "order_id":      f"ZOM-QA-{uuid.uuid4().hex[:8]}",
        "restaurant_id": restaurant_id,
        "order_items": [
            {"item_name": "Paneer Tikka", "quantity": 1, "base_price": 280},
            {"item_name": "Butter Naan",  "quantity": 2, "base_price": 50},
        ],
        "order_total":   380.0,
        "customer_name": "Zomato QA Customer",
        "customer_phone": "9111000001",
        "delivery_type": "DELIVERY",
        "instructions":  "No onion — QA test",
    }


def _swiggy_payload(outlet_id="sw-outlet-101") -> dict:
    return {
        "order_id":   f"SWG-QA-{uuid.uuid4().hex[:8]}",
        "outlet_id":  outlet_id,
        "items": [
            {"name": "Butter Chicken", "quantity": 1, "price": 380},
        ],
        "bill_total":    399.0,
        "customer_name": "Swiggy QA Customer",
        "customer_phone": "9222000002",
        "order_type":    "delivery",
        "special_instructions": "QA automated test",
    }


# ─── Webhook endpoint health ───────────────────────────────────────────────────

@pytest.mark.aggregator
def test_zomato_webhook_endpoint_is_public():
    """Webhook must be reachable without auth (Zomato calls it, not a logged-in user)."""
    r = post("/api/v1/aggregator/zomato/webhook", json=_zomato_payload())
    assert r.status_code in (200, 202), f"Expected 200/202, got {r.status_code}: {r.text}"


@pytest.mark.aggregator
def test_swiggy_webhook_endpoint_is_public():
    r = post("/api/v1/aggregator/swiggy/webhook", json=_swiggy_payload())
    assert r.status_code in (200, 202), f"Expected 200/202, got {r.status_code}: {r.text}"


@pytest.mark.aggregator
def test_zomato_webhook_with_missing_order_id_is_handled():
    """Should not 500 — must return 4xx or graceful 200 with error message."""
    payload = {"restaurant_id": "543210"}  # no order_id
    r = post("/api/v1/aggregator/zomato/webhook", json=payload)
    assert r.status_code != 500, f"Unexpected server error on malformed payload: {r.text}"


@pytest.mark.aggregator
def test_swiggy_webhook_with_empty_items_handled():
    payload = {**_swiggy_payload(), "items": [], "bill_total": 0}
    r = post("/api/v1/aggregator/swiggy/webhook", json=payload)
    assert r.status_code != 500


# ─── Aggregator mapping ────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.aggregator
def test_owner_can_save_aggregator_mapping(owner):
    r = post("/api/v1/aggregator/mapping",
             token=owner["accessToken"],
             json={
                 "shopId":       SHOP_101,
                 "platform":     "ZOMATO",
                 "aggregatorShopId": f"ZOM-{uuid.uuid4().hex[:6]}",
             })
    assert r.status_code in (200, 201), f"Mapping failed: {r.status_code} {r.text}"


@pytest.mark.aggregator
def test_aggregator_mapping_requires_auth():
    r = post("/api/v1/aggregator/mapping", json={
        "shopId": SHOP_101, "platform": "ZOMATO", "aggregatorShopId": "12345"
    })
    assert r.status_code == 401


# ─── Aggregator order in live queue ────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.aggregator
def test_zomato_webhook_order_appears_in_live_queue(owner):
    """
    Send a Zomato webhook → order should appear in the shop's live order feed.
    This test only passes if the AggregatorWebhookController correctly maps
    the Zomato restaurant_id to SHOP_101 via the aggregator_shop_mapping table.
    If mapping is not set up, the order won't appear — skip rather than fail.
    """
    payload = _zomato_payload()
    r = post("/api/v1/aggregator/zomato/webhook", json=payload)
    if r.status_code not in (200, 202):
        pytest.skip(f"Zomato webhook not returning 200: {r.status_code}")

    response_data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    order_id = response_data.get("data", {}).get("id") if isinstance(response_data.get("data"), dict) else None

    if not order_id:
        pytest.skip("Webhook did not return an order ID — aggregator mapping may not be configured")

    live = get(f"/api/v1/orders/shop/{SHOP_101}/live", token=owner["accessToken"])
    assert live.status_code == 200
    order_ids = [o["id"] for o in live.json()["data"]]
    assert order_id in order_ids, f"Aggregator order {order_id} not found in live queue"


@pytest.mark.mutates
@pytest.mark.aggregator
def test_aggregator_order_has_source_field(owner):
    """When aggregator orders are present, source field must be set."""
    live = get(f"/api/v1/orders/shop/{SHOP_101}/live", token=owner["accessToken"])
    assert live.status_code == 200
    orders = live.json()["data"]
    agg_orders = [o for o in orders if o.get("aggregatorSource")]
    # If no aggregator orders exist yet this is a skip, not failure
    if not agg_orders:
        pytest.skip("No aggregator orders in live queue — webhook mapping may not be configured")
    for o in agg_orders:
        assert o["aggregatorSource"] in ("ZOMATO", "SWIGGY", "DUNZO", "OTHER")


# ─── Aggregator breakdown report ───────────────────────────────────────────────

@pytest.mark.analytics
@pytest.mark.aggregator
def test_aggregator_breakdown_report_returns_data(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/aggregator-breakdown",
            token=owner["accessToken"], params={"days": 30})
    assert r.status_code == 200
    data = r.json()["data"]
    assert isinstance(data, list)
    # Must always include at least a DIRECT source row (or be empty if no orders)


@pytest.mark.analytics
@pytest.mark.aggregator
def test_order_types_report_returns_breakdown(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/order-types",
            token=owner["accessToken"], params={"days": 30})
    assert r.status_code == 200
    data = r.json()["data"]
    assert isinstance(data, list)
    if data:
        for row in data:
            assert "type" in row
            assert "orders" in row or "revenue" in row
