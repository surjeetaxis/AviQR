import pytest
from client import get, post
from config import SHOP_101, QR_CODE_SPICEROUTE


@pytest.mark.mutates
def test_owner_can_create_and_list_qr_codes(owner):
    create = post(f"/api/v1/qr-codes/shop/{SHOP_101}", token=owner["accessToken"],
                  params={"label": "QA Automation Table", "type": "TABLE", "group": "99"})
    assert create.status_code == 200

    listing = get(f"/api/v1/qr-codes/shop/{SHOP_101}", token=owner["accessToken"])
    assert listing.status_code == 200
    labels = [q["label"] for q in listing.json()["data"]]
    assert "QA Automation Table" in labels


def test_other_owner_cannot_create_qr_for_this_shop(owner2):
    r = post(f"/api/v1/qr-codes/shop/{SHOP_101}", token=owner2["accessToken"], params={"label": "Hijack"})
    assert r.status_code == 403


def test_qr_redirect_is_public_and_redirects_to_menu():
    r = get(f"/api/v1/qr-codes/r/{QR_CODE_SPICEROUTE}", allow_redirects=False)
    assert r.status_code == 302
    assert SHOP_101 in r.headers["Location"]


def test_qr_image_download_is_public():
    r = get(f"/api/v1/qr-codes/{QR_CODE_SPICEROUTE}/image")
    assert r.status_code == 200
    assert r.headers["Content-Type"] == "image/png"
