import pytest
from client import get, post, put, delete
from config import MALL_1, SHOP_101, SHOP_104, VENDOR_SPICE_ROUTE, VENDOR_WOK_TO_WALK


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


# ── Vendor impersonation token (Mall Reports tab) ──────────────────────────────
# Mirrors hotel-service's hotel-outlets/{id}/enter: the mall admin's own login JWT
# has no shopId, so report-service (and any other shop-scoped service) 403s a
# direct call — the Reports tab must mint a vendor-scoped token first.

def test_mall_admin_own_token_cannot_call_report_service_directly(mall_admin):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/revenue", token=mall_admin["accessToken"], params={"days": 7})
    assert r.status_code == 403


def test_enter_vendor_with_shop_mints_scoped_token_that_report_service_accepts(mall_admin):
    entered = post(f"/api/v1/vendors/{VENDOR_SPICE_ROUTE}/enter", token=mall_admin["accessToken"])
    assert entered.status_code == 200
    body = entered.json()["data"]
    assert body["shopId"] == SHOP_101

    r = get(f"/api/v1/reports/shop/{SHOP_101}/revenue", token=body["accessToken"], params={"days": 7})
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


def test_enter_vendor_without_shop_is_rejected(mall_admin):
    r = post(f"/api/v1/vendors/{VENDOR_WOK_TO_WALK}/enter", token=mall_admin["accessToken"])
    assert r.status_code == 400


def test_unrelated_admin_cannot_enter_vendor(owner):
    r = post(f"/api/v1/vendors/{VENDOR_SPICE_ROUTE}/enter", token=owner["accessToken"])
    assert r.status_code == 403


# ── Restaurant Request Flow ─────────────────────────────────────────────────────
# Mall admin enters a restaurant's shop id -> PENDING request -> owner accepts/rejects
# -> only ACCEPT makes it ACTIVE and visible in the public (Food Court QR) listing.
# owner3 owns SHOP_104 (Cake Studio) and has no pre-existing vendor link, so it's a
# clean shop id for these tests. Each mutating test deletes the vendor row it created
# so re-runs start from a clean slate (mall-service has no delete-mall endpoint but
# does have delete-vendor, same self-cleaning pattern as test_vendor_lifecycle).

def test_unrelated_admin_cannot_send_restaurant_request(owner):
    r = post("/api/v1/vendors/request", token=owner["accessToken"],
             json={"mallId": MALL_1, "shopId": SHOP_104})
    assert r.status_code == 403


def test_request_for_nonexistent_shop_is_404(mall_admin):
    r = post("/api/v1/vendors/request", token=mall_admin["accessToken"],
             json={"mallId": MALL_1, "shopId": "00000000-0000-0000-0000-000000000000"})
    assert r.status_code == 404


def _clear_existing_link(admin_token, shop_id):
    """Other suites (Playwright) share this DB and may leave SHOP_104 linked —
    delete any pre-existing vendor row for it so these tests always start clean."""
    vendors = get(f"/api/v1/vendors/mall/{MALL_1}", token=admin_token).json()["data"]
    for v in vendors:
        if v.get("shopId") == shop_id:
            delete(f"/api/v1/vendors/{v['id']}", token=admin_token)


@pytest.mark.mutates
def test_restaurant_request_full_lifecycle(mall_admin, owner3, owner, admin):
    _clear_existing_link(admin["accessToken"], SHOP_104)

    # 1. mall admin sends a request — looks the shop up in shop-service for its real name
    create = post("/api/v1/vendors/request", token=mall_admin["accessToken"],
                   json={"mallId": MALL_1, "shopId": SHOP_104})
    assert create.status_code == 200
    vendor = create.json()["data"]
    vendor_id = vendor["id"]
    assert vendor["status"] == "PENDING"
    assert vendor["name"] == "Cake Studio"

    try:
        # 2. duplicate request while pending is rejected
        dup = post("/api/v1/vendors/request", token=mall_admin["accessToken"],
                    json={"mallId": MALL_1, "shopId": SHOP_104})
        assert dup.status_code == 409

        # 3. the shop's real owner sees it; an unrelated owner does not
        mine = get("/api/v1/vendors/requests/mine", token=owner3["accessToken"],
                   params={"shopIds": SHOP_104}).json()["data"]
        assert any(r["id"] == vendor_id for r in mine)

        unrelated = get("/api/v1/vendors/requests/mine", token=owner["accessToken"],
                        params={"shopIds": SHOP_101}).json()["data"]
        assert not any(r["id"] == vendor_id for r in unrelated)

        # 4. an unrelated owner cannot respond on someone else's behalf
        hijack = put(f"/api/v1/vendors/{vendor_id}/respond", token=owner["accessToken"],
                     params={"decision": "ACCEPT"})
        assert hijack.status_code == 403

        # 5. not yet in the public food-court listing (still PENDING)
        public_before = get(f"/api/v1/malls/public/{MALL_1}/vendors").json()["data"]
        assert not any(v["id"] == vendor_id for v in public_before)

        # 6. the rightful owner accepts
        accept = put(f"/api/v1/vendors/{vendor_id}/respond", token=owner3["accessToken"],
                     params={"decision": "ACCEPT"})
        assert accept.status_code == 200
        assert accept.json()["data"]["status"] == "ACTIVE"

        # 7. now appears in the public listing — this is what feeds the Food Court QR flow
        public_after = get(f"/api/v1/malls/public/{MALL_1}/vendors").json()["data"]
        assert any(v["id"] == vendor_id for v in public_after)

        # 8. responding again is rejected — already resolved
        again = put(f"/api/v1/vendors/{vendor_id}/respond", token=owner3["accessToken"],
                    params={"decision": "ACCEPT"})
        assert again.status_code == 400
    finally:
        delete(f"/api/v1/vendors/{vendor_id}", token=admin["accessToken"])


@pytest.mark.mutates
def test_restaurant_request_reject_then_reinvite(mall_admin, owner3, admin):
    _clear_existing_link(admin["accessToken"], SHOP_104)

    create = post("/api/v1/vendors/request", token=mall_admin["accessToken"],
                   json={"mallId": MALL_1, "shopId": SHOP_104})
    vendor_id = create.json()["data"]["id"]

    try:
        reject = put(f"/api/v1/vendors/{vendor_id}/respond", token=owner3["accessToken"],
                     params={"decision": "REJECT"})
        assert reject.status_code == 200
        assert reject.json()["data"]["status"] == "REJECTED"

        public = get(f"/api/v1/malls/public/{MALL_1}/vendors").json()["data"]
        assert not any(v["id"] == vendor_id for v in public)

        # re-requesting after a rejection is allowed and reuses the same row
        reinvite = post("/api/v1/vendors/request", token=mall_admin["accessToken"],
                        json={"mallId": MALL_1, "shopId": SHOP_104})
        assert reinvite.status_code == 200
        assert reinvite.json()["data"]["id"] == vendor_id
        assert reinvite.json()["data"]["status"] == "PENDING"
    finally:
        delete(f"/api/v1/vendors/{vendor_id}", token=admin["accessToken"])
