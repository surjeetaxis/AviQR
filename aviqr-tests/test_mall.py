import pytest
from client import get, post, put, delete
from config import MALL_1


def test_get_mall_requires_auth(customer):
    r = get(f"/api/v1/malls/{MALL_1}")
    assert r.status_code == 401

    r2 = get(f"/api/v1/malls/{MALL_1}", token=customer["accessToken"])
    assert r2.status_code == 200
    assert r2.json()["data"]["name"] == "Forum Mall Bengaluru"


def test_public_vendor_directory_needs_no_auth():
    r = get(f"/api/v1/malls/public/{MALL_1}/vendors")
    assert r.status_code == 200
    assert all(v["active"] for v in r.json()["data"])


def test_admin_sees_own_mall_in_my_malls(mall_admin):
    r = get("/api/v1/malls/my", token=mall_admin["accessToken"])
    assert r.status_code == 200
    ids = [m["id"] for m in r.json()["data"]]
    assert MALL_1 in ids


@pytest.mark.mutates
def test_vendor_lifecycle(mall_admin):
    create = post("/api/v1/vendors", token=mall_admin["accessToken"], json={
        "mallId": MALL_1, "name": "QA Automation Vendor", "category": "Test", "floor": "GF",
    })
    assert create.status_code == 200
    vendor_id = create.json()["data"]["id"]

    toggle = put(f"/api/v1/vendors/{vendor_id}/status", token=mall_admin["accessToken"],
                 params={"active": "false"})
    assert toggle.status_code == 200

    listing = get(f"/api/v1/vendors/mall/{MALL_1}", token=mall_admin["accessToken"])
    vendor = next(v for v in listing.json()["data"] if v["id"] == vendor_id)
    assert vendor["active"] is False

    deleted = delete(f"/api/v1/vendors/{vendor_id}", token=mall_admin["accessToken"])
    assert deleted.status_code == 200


def test_unrelated_user_cannot_add_vendor(owner):
    r = post("/api/v1/vendors", token=owner["accessToken"], json={"mallId": MALL_1, "name": "Hijack"})
    assert r.status_code == 403


def test_only_admin_can_list_all_malls(admin):
    r = get("/api/v1/malls", token=admin["accessToken"])
    assert r.status_code == 200
    assert len(r.json()["data"]) >= 3  # 3 hand-written demo malls


@pytest.mark.mutates
def test_mall_admin_can_create_a_new_mall(mall_admin):
    create = post("/api/v1/malls", token=mall_admin["accessToken"], json={
        "name": "QA Automation Mall", "city": "Bengaluru", "phone": "9000000002",
    })
    assert create.status_code == 200
    assert create.json()["data"]["adminId"] == mall_admin["userId"]

    mine = get("/api/v1/malls/my", token=mall_admin["accessToken"])
    names = [m["name"] for m in mine.json()["data"]]
    assert "QA Automation Mall" in names


@pytest.mark.mutates
def test_mall_update_round_trip(mall_admin):
    original = get(f"/api/v1/malls/{MALL_1}", token=mall_admin["accessToken"]).json()["data"]

    r = put(f"/api/v1/malls/{MALL_1}", token=mall_admin["accessToken"], json={
        "name": original["name"], "city": "QA Automation City",
    })
    assert r.status_code == 200
    assert r.json()["data"]["city"] == "QA Automation City"

    put(f"/api/v1/malls/{MALL_1}", token=mall_admin["accessToken"], json={
        "name": original["name"], "city": original["city"],
    })
