"""
Guest Services (QR service hub) tests — hotel-service v2.3
Covers the public guest-facing flow + staff ops:
  • QR service hub (public, no auth)
  • Guest service requests (housekeeping/amenities/concierge)
  • Outlet bookings (spa/activity) with charge-to-room vs pay-direct
  • Running folio
  • Direct payment recording
  • Staff view/manage requests and bookings
"""
import pytest
from client import get, post, put
from config import HOTEL_1


# ── Public service hub ────────────────────────────────────────────────────────

def test_service_hub_is_public_no_auth_needed():
    """A guest scanning a QR has no login — the hub must be reachable without a token."""
    r = get(f"/api/v1/public/hotel/{HOTEL_1}/services")
    assert r.status_code == 200
    data = r.json()["data"]
    assert "hotelName" in data
    assert "outlets" in data
    assert isinstance(data["outlets"], list)


def test_service_hub_unknown_hotel_returns_404():
    r = get("/api/v1/public/hotel/00000000-0000-0000-0000-0000000000ff/services")
    assert r.status_code == 404


def test_service_hub_with_area_param_surfaces_that_outlet_first():
    r = get(f"/api/v1/public/hotel/{HOTEL_1}/services", params={"area": "POOL"})
    assert r.status_code == 200
    assert r.json()["data"]["scannedArea"] == "POOL"


# ── Guest service requests ────────────────────────────────────────────────────

@pytest.mark.mutates
def test_guest_raises_housekeeping_request_publicly():
    r = post(f"/api/v1/public/hotel/{HOTEL_1}/service-request", json={
        "roomNumber": "101",
        "guestName": "QA Guest",
        "type": "AMENITIES",
        "details": "2 extra towels and a toothbrush",
    })
    assert r.status_code == 200
    body = r.json()["data"]
    assert body["roomNumber"] == "101"
    assert body["type"] == "AMENITIES"
    assert body["status"] == "NEW"


@pytest.mark.mutates
def test_service_request_without_room_is_rejected():
    r = post(f"/api/v1/public/hotel/{HOTEL_1}/service-request", json={
        "type": "HOUSEKEEPING", "details": "no room number given",
    })
    assert r.status_code == 400


@pytest.mark.mutates
def test_staff_sees_and_updates_guest_request(hotel_owner):
    # guest raises
    post(f"/api/v1/public/hotel/{HOTEL_1}/service-request", json={
        "roomNumber": "201", "type": "MAINTENANCE", "details": "AC not cooling",
    })
    # staff lists
    lst = get(f"/api/v1/hotel/{HOTEL_1}/service-requests", token=hotel_owner["accessToken"])
    assert lst.status_code == 200
    reqs = lst.json()["data"]
    assert any(x["details"] == "AC not cooling" for x in reqs)
    # staff marks one DONE
    rid = reqs[0]["id"]
    upd = put(f"/api/v1/hotel/service-requests/{rid}/status?status=DONE",
              token=hotel_owner["accessToken"])
    assert upd.status_code == 200
    assert upd.json()["data"]["status"] == "DONE"


def test_staff_request_list_requires_access(customer):
    r = get(f"/api/v1/hotel/{HOTEL_1}/service-requests", token=customer["accessToken"])
    assert r.status_code == 403


# ── Outlet bookings ───────────────────────────────────────────────────────────

@pytest.mark.mutates
def test_guest_books_spa_slot_pay_direct():
    # fetch an outlet id from the hub
    hub = get(f"/api/v1/public/hotel/{HOTEL_1}/services").json()["data"]
    if not hub["outlets"]:
        pytest.skip("no outlets configured for demo hotel")
    outlet = hub["outlets"][0]
    r = post(f"/api/v1/public/hotel/{HOTEL_1}/book", json={
        "outletId": outlet["id"],
        "roomNumber": "301",
        "serviceName": "QA Swedish Massage 60min",
        "price": 2500,
        "bookingDate": "2026-07-15",
        "bookingTime": "15:30",
        "partySize": 1,
        "guestName": "QA Guest",
        "paymentChoice": "PAY_DIRECT",
    })
    assert r.status_code == 200
    b = r.json()["data"]
    assert b["serviceName"] == "QA Swedish Massage 60min"
    assert b["paymentChoice"] == "PAY_DIRECT"
    assert b["status"] == "REQUESTED"


@pytest.mark.mutates
def test_booking_with_bad_outlet_id_rejected():
    r = post(f"/api/v1/public/hotel/{HOTEL_1}/book", json={
        "outletId": "not-a-uuid", "roomNumber": "301",
    })
    assert r.status_code == 400


@pytest.mark.mutates
def test_staff_confirms_a_booking(hotel_owner):
    lst = get(f"/api/v1/hotel/{HOTEL_1}/bookings", token=hotel_owner["accessToken"])
    assert lst.status_code == 200
    bookings = lst.json()["data"]
    if not bookings:
        pytest.skip("no bookings yet")
    bid = bookings[0]["id"]
    upd = put(f"/api/v1/hotel/bookings/{bid}/status?status=CONFIRMED",
              token=hotel_owner["accessToken"])
    assert upd.status_code == 200
    assert upd.json()["data"]["status"] == "CONFIRMED"


# ── Folio ─────────────────────────────────────────────────────────────────────

def test_folio_returns_totals_for_room():
    r = get(f"/api/v1/public/hotel/{HOTEL_1}/folio", params={"room": "101"})
    assert r.status_code == 200
    data = r.json()["data"]
    assert "pendingTotal" in data
    assert "grandTotal" in data
    assert isinstance(data["charges"], list)


@pytest.mark.mutates
def test_pay_direct_records_settled_charge():
    r = post(f"/api/v1/public/hotel/{HOTEL_1}/pay-direct", json={
        "roomNumber": "101",
        "amount": 450,
        "description": "QA Poolside drinks",
        "paymentRef": "qa_txn_123",
    })
    assert r.status_code == 200
    c = r.json()["data"]
    assert c["status"] == "SETTLED"
    assert c["paymentChoice"] == "PAY_DIRECT"
    assert c["paymentRef"] == "qa_txn_123"
