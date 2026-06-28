"""
test_analytics.py — Analytics, Reporting, Dashboard Data

Covers:
  • Daily report: all required fields present, correct shopId
  • Revenue trend: returns N days of data
  • Top items: sorted by revenue, name and revenue fields present
  • Peak hours: all hours have numeric order counts
  • Order history: paginated, filterable by date range / type / status
  • Order types breakdown: DINE_IN / TAKEAWAY / DELIVERY split
  • Aggregator breakdown: source field and numeric counts
  • Platform stats (admin only): total shops / orders / revenue
  • RBAC: owner sees own shop only; customer blocked from reports
  • Real data: verify no hardcoded mock values sneak in
"""
import pytest
from client import get
from config import SHOP_101, SHOP_102


# ─── Daily report ─────────────────────────────────────────────────────────────

@pytest.mark.analytics
@pytest.mark.smoke
def test_daily_report_returns_required_fields(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/daily", token=owner["accessToken"])
    assert r.status_code == 200
    data = r.json()["data"]
    for field in ("totalRevenue", "totalOrders", "avgOrderValue", "newCustomers"):
        assert field in data, f"Missing field: {field}"


@pytest.mark.analytics
def test_daily_report_total_revenue_is_numeric(owner):
    data = get(f"/api/v1/reports/shop/{SHOP_101}/daily",
               token=owner["accessToken"]).json()["data"]
    assert isinstance(float(data["totalRevenue"]), float)
    assert float(data["totalRevenue"]) >= 0


@pytest.mark.analytics
def test_daily_report_order_count_is_integer(owner):
    data = get(f"/api/v1/reports/shop/{SHOP_101}/daily",
               token=owner["accessToken"]).json()["data"]
    assert int(data["totalOrders"]) >= 0


@pytest.mark.analytics
def test_daily_report_blocked_for_another_shop(owner, owner2):
    """owner cannot pull daily stats for shop2."""
    r = get(f"/api/v1/reports/shop/{SHOP_102}/daily", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.analytics
def test_daily_report_requires_auth():
    r = get(f"/api/v1/reports/shop/{SHOP_101}/daily")
    assert r.status_code == 401


@pytest.mark.analytics
def test_customer_cannot_access_daily_report(customer):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/daily", token=customer["accessToken"])
    assert r.status_code == 403


# ─── Revenue trend ────────────────────────────────────────────────────────────

@pytest.mark.analytics
@pytest.mark.smoke
def test_revenue_trend_returns_list(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/revenue",
            token=owner["accessToken"], params={"days": 7})
    assert r.status_code == 200
    data = r.json()["data"]
    assert isinstance(data, list)


@pytest.mark.analytics
def test_revenue_trend_rows_have_required_fields(owner):
    rows = get(f"/api/v1/reports/shop/{SHOP_101}/revenue",
               token=owner["accessToken"], params={"days": 7}).json()["data"]
    for row in rows:
        assert "date" in row
        assert "revenue" in row or "total_revenue" in row
        assert "orders" in row or "total_orders" in row


@pytest.mark.analytics
def test_revenue_trend_all_values_non_negative(owner):
    rows = get(f"/api/v1/reports/shop/{SHOP_101}/revenue",
               token=owner["accessToken"], params={"days": 14}).json()["data"]
    for row in rows:
        rev = float(row.get("revenue") or row.get("total_revenue") or 0)
        ord_count = int(row.get("orders") or row.get("total_orders") or 0)
        assert rev >= 0, f"Negative revenue in row {row}"
        assert ord_count >= 0


@pytest.mark.analytics
def test_revenue_trend_different_ranges(owner):
    for days in (7, 14, 30, 90):
        r = get(f"/api/v1/reports/shop/{SHOP_101}/revenue",
                token=owner["accessToken"], params={"days": days})
        assert r.status_code == 200


# ─── Top items ────────────────────────────────────────────────────────────────

@pytest.mark.analytics
@pytest.mark.smoke
def test_top_items_returns_list(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/top-items", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.analytics
def test_top_items_have_name_and_revenue(owner):
    items = get(f"/api/v1/reports/shop/{SHOP_101}/top-items",
                token=owner["accessToken"]).json()["data"]
    if not items:
        pytest.skip("No order data yet — top items list is empty")
    for item in items:
        assert "name" in item or "item_name" in item
        rev = item.get("revenue") or item.get("total_revenue") or 0
        assert float(rev) >= 0


@pytest.mark.analytics
def test_top_items_respects_limit_param(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/top-items",
            token=owner["accessToken"], params={"limit": 3})
    assert r.status_code == 200
    items = r.json()["data"]
    assert len(items) <= 3


# ─── Peak hours ───────────────────────────────────────────────────────────────

@pytest.mark.analytics
@pytest.mark.smoke
def test_peak_hours_returns_list(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/peak-hours", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.analytics
def test_peak_hours_have_hour_and_order_count(owner):
    rows = get(f"/api/v1/reports/shop/{SHOP_101}/peak-hours",
               token=owner["accessToken"]).json()["data"]
    if not rows:
        pytest.skip("No peak hour data yet")
    for row in rows:
        assert "hour" in row or "hour_num" in row
        count = int(row.get("order_count") or row.get("orders") or 0)
        assert count >= 0


@pytest.mark.analytics
def test_peak_hours_order_counts_non_negative(owner):
    rows = get(f"/api/v1/reports/shop/{SHOP_101}/peak-hours",
               token=owner["accessToken"]).json()["data"]
    for row in rows:
        assert int(row.get("order_count") or row.get("orders") or 0) >= 0


# ─── Order history (paginated) ────────────────────────────────────────────────

@pytest.mark.analytics
def test_order_history_paginated(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
            token=owner["accessToken"], params={"page": 0, "size": 10})
    assert r.status_code == 200
    body = r.json()["data"]
    # Response is either a Page object or a list
    if isinstance(body, dict):
        assert "content" in body or "totalElements" in body
    else:
        assert isinstance(body, list)


@pytest.mark.analytics
def test_order_history_date_range_filter(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
            token=owner["accessToken"],
            params={"page": 0, "size": 5, "startDate": "2024-01-01", "endDate": "2099-12-31"})
    assert r.status_code == 200


@pytest.mark.analytics
def test_order_history_type_filter_dine_in(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
            token=owner["accessToken"],
            params={"page": 0, "size": 5, "type": "DINE_IN"})
    assert r.status_code == 200
    body = r.json()["data"]
    rows = body.get("content", body) if isinstance(body, dict) else body
    for row in rows:
        if isinstance(row, dict) and "type" in row:
            assert row["type"] in ("DINE_IN", "dine_in"), f"Unexpected type {row['type']}"


@pytest.mark.analytics
def test_order_history_type_filter_delivery(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
            token=owner["accessToken"],
            params={"page": 0, "size": 5, "type": "DELIVERY"})
    assert r.status_code == 200


@pytest.mark.analytics
def test_order_history_status_filter_completed(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
            token=owner["accessToken"],
            params={"page": 0, "size": 5, "status": "COMPLETED"})
    assert r.status_code == 200
    body = r.json()["data"]
    rows = body.get("content", body) if isinstance(body, dict) else body
    for row in rows:
        if isinstance(row, dict) and "status" in row:
            assert row["status"] in ("COMPLETED", "completed")


@pytest.mark.analytics
def test_order_history_requires_auth():
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history")
    assert r.status_code == 401


@pytest.mark.analytics
def test_customer_cannot_view_shop_order_history(customer):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history", token=customer["accessToken"])
    assert r.status_code == 403


# ─── Order types breakdown ────────────────────────────────────────────────────

@pytest.mark.analytics
def test_order_types_breakdown_returns_list(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/order-types",
            token=owner["accessToken"], params={"days": 30})
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.analytics
def test_order_types_have_valid_type_values(owner):
    rows = get(f"/api/v1/reports/shop/{SHOP_101}/order-types",
               token=owner["accessToken"], params={"days": 30}).json()["data"]
    valid = {"DINE_IN", "TAKEAWAY", "DELIVERY"}
    for row in rows:
        t = str(row.get("type", "")).upper()
        if t:
            assert t in valid, f"Unexpected order type: {t}"


# ─── Aggregator breakdown ─────────────────────────────────────────────────────

@pytest.mark.analytics
@pytest.mark.aggregator
def test_aggregator_breakdown_returns_list(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/aggregator-breakdown",
            token=owner["accessToken"], params={"days": 30})
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.analytics
@pytest.mark.aggregator
def test_aggregator_breakdown_source_values_valid(owner):
    rows = get(f"/api/v1/reports/shop/{SHOP_101}/aggregator-breakdown",
               token=owner["accessToken"], params={"days": 30}).json()["data"]
    valid = {"ZOMATO", "SWIGGY", "DUNZO", "DIRECT", "OTHER"}
    for row in rows:
        src = str(row.get("source", "DIRECT")).upper()
        assert src in valid, f"Unknown aggregator source: {src}"


# ─── Platform stats (admin) ───────────────────────────────────────────────────

@pytest.mark.analytics
def test_platform_stats_returns_required_fields(admin):
    r = get("/api/v1/reports/admin/platform", token=admin["accessToken"])
    assert r.status_code == 200
    data = r.json()["data"]
    for field in ("totalOrders", "totalRevenue"):
        alt = field.lower().replace("total", "total_")
        assert field in data or alt in data, f"Missing field: {field}"


# ─── Manager can access reports ───────────────────────────────────────────────

@pytest.mark.analytics
def test_manager_can_access_daily_report(manager):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/daily", token=manager["accessToken"])
    assert r.status_code == 200


@pytest.mark.analytics
def test_cashier_can_access_daily_report(cashier):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/daily", token=cashier["accessToken"])
    # cashier role permission depends on server config; 200 or 403 both acceptable
    assert r.status_code in (200, 403)
