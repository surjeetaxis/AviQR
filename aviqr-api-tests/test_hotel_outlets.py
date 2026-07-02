"""
Hotel outlets — the endpoints backing the Hotel dashboard's Outlets, QR
Management, Reports and Spa tabs (list, enter/impersonation token, QR toggle).
"""
import pytest
from client import get, post, put
from config import HOTEL_1, OUTLET_ZODIAC_RESTAURANT, OUTLET_CELLAR_BAR, OUTLET_SERENITY_SPA


def test_owner_lists_hotel_outlets(hotel_owner):
    r = get(f"/api/v1/hotel-outlets/hotel/{HOTEL_1}", token=hotel_owner["accessToken"])
    assert r.status_code == 200
    outlets = r.json()["data"]
    ids = {o["id"] for o in outlets}
    assert OUTLET_ZODIAC_RESTAURANT in ids
    assert OUTLET_SERENITY_SPA in ids
    zodiac = next(o for o in outlets if o["id"] == OUTLET_ZODIAC_RESTAURANT)
    assert zodiac["shopId"]  # Reports tab depends on this being non-blank
    spa = next(o for o in outlets if o["id"] == OUTLET_SERENITY_SPA)
    assert spa["outletType"] == "SPA"  # Spa tab filters bookings by this


def test_unrelated_owner_cannot_list_outlets(owner):
    r = get(f"/api/v1/hotel-outlets/hotel/{HOTEL_1}", token=owner["accessToken"])
    assert r.status_code == 403


def test_enter_outlet_with_shop_mints_scoped_token(hotel_owner):
    r = post(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}/enter", token=hotel_owner["accessToken"])
    assert r.status_code == 200
    body = r.json()["data"]
    assert body["accessToken"]
    zodiac = get(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}", token=hotel_owner["accessToken"]).json()["data"]
    assert body["shopId"] == zodiac["shopId"]


def test_enter_outlet_without_shop_is_rejected(hotel_owner):
    r = post(f"/api/v1/hotel-outlets/{OUTLET_CELLAR_BAR}/enter", token=hotel_owner["accessToken"])
    assert r.status_code == 400


def test_unrelated_owner_cannot_enter_outlet(owner):
    r = post(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}/enter", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.mutates
def test_outlet_qr_toggle_round_trip(hotel_owner):
    """QR Management tab flips an outlet's QR on/off — round-trip so seed data ends unchanged."""
    original = get(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}", token=hotel_owner["accessToken"]).json()["data"]
    original_qr = original["qrActive"]

    off = put(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}/qr", token=hotel_owner["accessToken"],
              params={"active": "false"})
    assert off.status_code == 200
    after_off = get(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}", token=hotel_owner["accessToken"]).json()["data"]
    assert after_off["qrActive"] is False

    restore = put(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}/qr", token=hotel_owner["accessToken"],
                  params={"active": str(original_qr).lower()})
    assert restore.status_code == 200


def test_unrelated_owner_cannot_toggle_outlet_qr(owner):
    r = put(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}/qr", token=owner["accessToken"],
            params={"active": "false"})
    assert r.status_code == 403


def test_hotel_bookings_include_spa_outlet_id_for_spa_tab_filter(hotel_owner):
    """Spa tab joins bookings[].outletId against outlets where outletType==SPA — verify that join works."""
    r = get(f"/api/v1/hotel/{HOTEL_1}/bookings", token=hotel_owner["accessToken"])
    assert r.status_code == 200
    bookings = r.json()["data"]
    spa_bookings = [b for b in bookings if b["outletId"] == OUTLET_SERENITY_SPA]
    assert len(spa_bookings) >= 1


def test_hotel_owner_own_token_cannot_call_report_service_directly(hotel_owner):
    """The hotel owner's own login JWT has no shopId, so report-service's same-shop
    check 403s it directly — this is exactly why the Reports tab must go through
    hotel-outlets/{id}/enter first (see the next test)."""
    zodiac = get(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}", token=hotel_owner["accessToken"]).json()["data"]
    r = get(f"/api/v1/reports/shop/{zodiac['shopId']}/revenue", token=hotel_owner["accessToken"], params={"days": 7})
    assert r.status_code == 403


def test_hotel_outlet_revenue_feeds_reports_tab(hotel_owner):
    """Reports tab flow: enter the outlet to get a shop-scoped token, then call
    reportApi.getRevenue(outlet.shopId, 7, thatToken) — verify the real flow works."""
    zodiac = get(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}", token=hotel_owner["accessToken"]).json()["data"]
    entered = post(f"/api/v1/hotel-outlets/{OUTLET_ZODIAC_RESTAURANT}/enter", token=hotel_owner["accessToken"]).json()["data"]
    r = get(f"/api/v1/reports/shop/{zodiac['shopId']}/revenue", token=entered["accessToken"], params={"days": 7})
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)
