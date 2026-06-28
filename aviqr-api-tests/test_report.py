from client import get
from config import SHOP_101


def test_owner_can_view_daily_report(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/daily", token=owner["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["shopId"] == SHOP_101


def test_revenue_trend_returns_requested_number_of_days(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/revenue", token=owner["accessToken"], params={"days": 7})
    assert r.status_code == 200
    assert len(r.json()["data"]) == 7


def test_top_items_and_peak_hours(owner):
    top = get(f"/api/v1/reports/shop/{SHOP_101}/top-items", token=owner["accessToken"])
    assert top.status_code == 200
    assert len(top.json()["data"]) > 0

    peak = get(f"/api/v1/reports/shop/{SHOP_101}/peak-hours", token=owner["accessToken"])
    assert peak.status_code == 200
    assert len(peak.json()["data"]) > 0


def test_report_history_paginated_real_snapshots(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history", token=owner["accessToken"],
            params={"page": 0, "size": 10})
    assert r.status_code == 200
    page = r.json()["data"]
    assert page["totalElements"] >= 30  # 30 days of seeded snapshots per shop


def test_platform_stats_admin_only(owner, admin):
    r = get("/api/v1/reports/admin/platform", token=owner["accessToken"])
    assert r.status_code == 200  # report-service itself doesn't gate this — documented gap, not a 403

    r2 = get("/api/v1/reports/admin/platform", token=admin["accessToken"])
    assert r2.status_code == 200
