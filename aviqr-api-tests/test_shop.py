import pytest
from client import get, post, put, delete
from config import SHOP_101


def test_get_shop_by_id(owner):
    r = get(f"/api/v1/shops/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "Spice Route"


def test_list_shops_paginated(owner):
    r = get("/api/v1/shops", token=owner["accessToken"], params={"page": 0, "size": 10})
    assert r.status_code == 200
    page = r.json()["data"]
    assert page["totalElements"] >= 5  # at least the 5 hand-written demo shops


def test_owner_sees_own_shop_in_my_shops(owner):
    r = get("/api/v1/shops/my", token=owner["accessToken"])
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()["data"]]
    assert SHOP_101 in ids


@pytest.mark.mutates
def test_manager_can_update_own_shop_tagline(manager):
    """Update then immediately restore — read-modify-write so the demo data isn't left dirty."""
    original = get(f"/api/v1/shops/{SHOP_101}", token=manager["accessToken"]).json()["data"]

    r = put(f"/api/v1/shops/{SHOP_101}", token=manager["accessToken"], json={
        "name": original["name"],
        "phone": original["phone"],
        "tagline": "QA automation pass-through tagline",
    })
    assert r.status_code == 200
    assert r.json()["data"]["tagline"] == "QA automation pass-through tagline"

    restore = put(f"/api/v1/shops/{SHOP_101}", token=manager["accessToken"], json={
        "name": original["name"],
        "phone": original["phone"],
        "tagline": original["tagline"],
    })
    assert restore.status_code == 200
    assert restore.json()["data"]["tagline"] == original["tagline"]


@pytest.mark.mutates
def test_only_admin_can_change_shop_status(owner, admin):
    r = put(f"/api/v1/shops/{SHOP_101}/status", token=owner["accessToken"], params={"status": "ACTIVE"})
    assert r.status_code == 403

    # No-op status change as admin — shop was already ACTIVE, so this doesn't disturb anything.
    r2 = put(f"/api/v1/shops/{SHOP_101}/status", token=admin["accessToken"], params={"status": "ACTIVE"})
    assert r2.status_code == 200


@pytest.mark.mutates
def test_admin_can_trigger_tier_recalculation(admin):
    r = post("/api/v1/shops/admin/recalculate-tiers", token=admin["accessToken"])
    assert r.status_code == 200


def test_staff_list_includes_seeded_staff(owner):
    r = get(f"/api/v1/staff/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    names = [s["name"] for s in r.json()["data"]]
    assert "Chef Rangan" in names


def test_kitchen_role_can_also_read_settings(kitchen):
    r = get(f"/api/v1/settings/shop/{SHOP_101}", token=kitchen["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["shopId"] == SHOP_101


@pytest.mark.mutates
def test_owner_own_token_cannot_call_report_service_directly(owner):
    """The owner's login JWT DOES carry a shopId, so this actually succeeds unlike
    supplier/hotel/mall — included here for contrast with the /enter tests below."""
    r = get(f"/api/v1/reports/shop/{SHOP_101}/revenue", token=owner["accessToken"], params={"days": 7})
    assert r.status_code == 200


def test_supplier_own_token_cannot_call_report_service_directly(supplier):
    """A supplier owns several shops, not one, so their login JWT has no shopId —
    report-service's same-shop check 403s it directly. This is why the Supplier
    dashboard's Reports tab must go through shops/{id}/enter first (see next test)."""
    mine = get("/api/v1/shops/my", token=supplier["accessToken"]).json()["data"]
    r = get(f"/api/v1/reports/shop/{mine[0]['id']}/revenue", token=supplier["accessToken"], params={"days": 7})
    assert r.status_code == 403


def test_enter_shop_mints_scoped_token_that_report_service_accepts(supplier):
    mine = get("/api/v1/shops/my", token=supplier["accessToken"]).json()["data"]
    shop_id = mine[0]["id"]

    entered = post(f"/api/v1/shops/{shop_id}/enter", token=supplier["accessToken"])
    assert entered.status_code == 200
    body = entered.json()["data"]
    assert body["shopId"] == shop_id

    r = get(f"/api/v1/reports/shop/{shop_id}/revenue", token=body["accessToken"], params={"days": 7})
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


def test_unrelated_owner_cannot_enter_someone_elses_shop(supplier, owner):
    mine = get("/api/v1/shops/my", token=supplier["accessToken"]).json()["data"]
    r = post(f"/api/v1/shops/{mine[0]['id']}/enter", token=owner["accessToken"])
    assert r.status_code == 403


def test_admin_can_enter_any_shop(supplier, admin):
    mine = get("/api/v1/shops/my", token=supplier["accessToken"]).json()["data"]
    r = post(f"/api/v1/shops/{mine[0]['id']}/enter", token=admin["accessToken"])
    assert r.status_code == 200


def test_owner_can_create_a_new_shop(owner3):
    r = post("/api/v1/shops", token=owner3["accessToken"], json={
        "name": "QA Automation Shop", "phone": "9000000003",
    })
    assert r.status_code == 200
    assert r.json()["data"]["ownerId"] == owner3["userId"]
    assert r.json()["data"]["subscriptionPlan"] == "STARTER"

    mine = get("/api/v1/shops/my", token=owner3["accessToken"])
    names = [s["name"] for s in mine.json()["data"]]
    assert "QA Automation Shop" in names


@pytest.mark.mutates
def test_staff_add_update_and_remove_lifecycle(owner):
    add = post(f"/api/v1/staff/shop/{SHOP_101}", token=owner["accessToken"], json={
        "name": "QA Automation Staff", "phone": "9000000004", "role": "CASHIER",
    })
    assert add.status_code == 200
    staff_id = add.json()["data"]["id"]

    update = put(f"/api/v1/staff/{staff_id}", token=owner["accessToken"], json={
        "name": "QA Automation Staff Updated", "role": "KITCHEN", "active": True,
    })
    assert update.status_code == 200
    assert update.json()["data"]["name"] == "QA Automation Staff Updated"

    removed = delete(f"/api/v1/staff/{staff_id}", token=owner["accessToken"])
    assert removed.status_code == 200

    listing = get(f"/api/v1/staff/shop/{SHOP_101}", token=owner["accessToken"]).json()["data"]
    removed_entry = next(s for s in listing if s["id"] == staff_id)
    assert removed_entry["active"] is False


@pytest.mark.mutates
def test_shop_settings_update_round_trip(owner):
    original = get(f"/api/v1/settings/shop/{SHOP_101}", token=owner["accessToken"]).json()["data"]

    r = put(f"/api/v1/settings/shop/{SHOP_101}", token=owner["accessToken"], json={
        "cashEnabled": True, "onlineEnabled": True, "taxPercent": 8.00,
        "businessName": original.get("businessName"),
    })
    assert r.status_code == 200
    assert float(r.json()["data"]["taxPercent"]) == 8.00

    put(f"/api/v1/settings/shop/{SHOP_101}", token=owner["accessToken"], json={
        "cashEnabled": original["cashEnabled"], "onlineEnabled": original["onlineEnabled"],
        "taxPercent": original["taxPercent"], "businessName": original.get("businessName"),
    })


# ── Customer Portal: favorites (phone-keyed, same lightweight identity model as loyalty) ──

@pytest.mark.mutates
def test_favorite_toggle_and_list_round_trip(customer):
    phone = "9" + "".join(str((i * 7) % 10) for i in range(9))  # deterministic-ish test phone

    fav = post("/api/v1/favorites", token=customer["accessToken"], json={"phone": phone, "shopId": SHOP_101})
    assert fav.status_code == 200
    assert fav.json()["data"]["favorited"] is True

    mine = get("/api/v1/favorites/mine", token=customer["accessToken"], params={"phone": phone})
    assert mine.status_code == 200
    shop_ids = [f["shopId"] for f in mine.json()["data"]]
    assert SHOP_101 in shop_ids
    assert any(f["shopName"] == "Spice Route" for f in mine.json()["data"])

    unfav = post("/api/v1/favorites", token=customer["accessToken"], json={"phone": phone, "shopId": SHOP_101})
    assert unfav.status_code == 200
    assert unfav.json()["data"]["favorited"] is False

    mine_after = get("/api/v1/favorites/mine", token=customer["accessToken"], params={"phone": phone}).json()["data"]
    assert SHOP_101 not in [f["shopId"] for f in mine_after]


def test_favorites_are_scoped_per_phone(customer):
    mine = get("/api/v1/favorites/mine", token=customer["accessToken"], params={"phone": "9000000000"})
    assert mine.status_code == 200
    assert mine.json()["data"] == []
