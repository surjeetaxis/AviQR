import pytest
from client import get, post, put
from config import HOTEL_1, ROOM_1_VACANT


def test_get_hotel_requires_auth_but_any_role_works(customer, hotel_owner):
    r = get(f"/api/v1/hotels/{HOTEL_1}")
    assert r.status_code == 401

    r2 = get(f"/api/v1/hotels/{HOTEL_1}", token=customer["accessToken"])
    assert r2.status_code == 200
    assert r2.json()["data"]["name"] == "Grand Palace Hotel"


def test_owner_sees_own_hotel_in_my_hotels(hotel_owner):
    r = get("/api/v1/hotels/my", token=hotel_owner["accessToken"])
    assert r.status_code == 200
    ids = [h["id"] for h in r.json()["data"]]
    assert HOTEL_1 in ids


def test_rooms_list_for_hotel(hotel_owner):
    r = get(f"/api/v1/rooms/hotel/{HOTEL_1}", token=hotel_owner["accessToken"])
    assert r.status_code == 200
    assert len(r.json()["data"]) >= 8  # 8 hand-written demo rooms


@pytest.mark.mutates
def test_guest_submits_room_request_and_owner_sees_it(customer, hotel_owner):
    create = post("/api/v1/room-requests", token=customer["accessToken"], json={
        "hotelId": HOTEL_1, "roomNumber": "102",
        "serviceType": "ROOM_SERVICE", "description": "QA automation test request",
    })
    assert create.status_code == 200
    request_id = create.json()["data"]["id"]

    listing = get(f"/api/v1/room-requests/hotel/{HOTEL_1}", token=hotel_owner["accessToken"],
                  params={"liveOnly": "true"})
    assert listing.status_code == 200
    ids = [r["id"] for r in listing.json()["data"]]
    assert request_id in ids

    update = put(f"/api/v1/room-requests/{request_id}/status", token=hotel_owner["accessToken"],
                 params={"status": "DONE"})
    assert update.status_code == 200
    assert update.json()["data"]["status"] == "DONE"


def test_unrelated_owner_cannot_manage_room_requests(owner):
    r = get(f"/api/v1/room-requests/hotel/{HOTEL_1}", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.mutates
def test_room_status_round_trip(hotel_owner):
    """Flip a vacant room to MAINTENANCE then back, so seed data ends unchanged."""
    off = put(f"/api/v1/rooms/{ROOM_1_VACANT}/status", token=hotel_owner["accessToken"],
              params={"status": "MAINTENANCE"})
    assert off.status_code == 200

    rooms = get(f"/api/v1/rooms/hotel/{HOTEL_1}", token=hotel_owner["accessToken"]).json()["data"]
    room = next(r for r in rooms if r["id"] == ROOM_1_VACANT)
    assert room["status"] == "MAINTENANCE"

    restore = put(f"/api/v1/rooms/{ROOM_1_VACANT}/status", token=hotel_owner["accessToken"],
                  params={"status": "VACANT"})
    assert restore.status_code == 200


@pytest.mark.mutates
def test_owner_can_create_hotel_and_room(hotel_owner):
    hotel = post("/api/v1/hotels", token=hotel_owner["accessToken"], json={
        "name": "QA Automation Hotel", "phone": "9000000001", "totalRooms": 10,
    })
    assert hotel.status_code == 200
    hotel_id = hotel.json()["data"]["id"]
    assert hotel.json()["data"]["ownerId"] == hotel_owner["userId"]

    room = post("/api/v1/rooms", token=hotel_owner["accessToken"], json={
        "hotelId": hotel_id, "roomNumber": "1", "roomType": "Standard",
    })
    assert room.status_code == 200
    assert room.json()["data"]["hotelId"] == hotel_id

    listing = get(f"/api/v1/rooms/hotel/{hotel_id}", token=hotel_owner["accessToken"])
    assert len(listing.json()["data"]) == 1


def test_unrelated_owner_cannot_create_room_for_someone_elses_hotel(owner):
    r = post("/api/v1/rooms", token=owner["accessToken"], json={"hotelId": HOTEL_1, "roomNumber": "999"})
    assert r.status_code == 403
