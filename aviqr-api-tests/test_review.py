import pytest
from client import get, post
from config import SHOP_101, ITEM_101_PANEER_TIKKA


def test_public_shop_reviews_and_summary_need_no_auth():
    reviews = get(f"/api/v1/reviews/public/shop/{SHOP_101}")
    assert reviews.status_code == 200
    assert reviews.json()["data"]["totalElements"] >= 3  # 3 hand-written demo reviews for this shop

    summary = get(f"/api/v1/reviews/public/shop/{SHOP_101}/summary")
    assert summary.status_code == 200
    assert summary.json()["data"]["ratingCount"] >= 3


def test_public_product_reviews_and_summary():
    reviews = get(f"/api/v1/reviews/public/product/{ITEM_101_PANEER_TIKKA}")
    assert reviews.status_code == 200

    summary = get(f"/api/v1/reviews/public/product/{ITEM_101_PANEER_TIKKA}/summary")
    assert summary.status_code == 200


def test_submitting_a_review_requires_auth():
    r = post("/api/v1/reviews", json={
        "shopId": SHOP_101, "customerName": "Anonymous", "rating": 5,
    })
    assert r.status_code == 401


@pytest.mark.mutates
def test_customer_submits_review_and_it_appears_in_their_history(customer):
    submit = post("/api/v1/reviews", token=customer["accessToken"], json={
        "shopId": SHOP_101, "menuItemId": ITEM_101_PANEER_TIKKA,
        "customerName": "QA Automation Customer", "rating": 5,
        "comment": "Submitted by the automated test suite.",
    })
    assert submit.status_code == 200
    review = submit.json()["data"]

    mine = get(f"/api/v1/reviews/customer/{customer['userId']}", token=customer["accessToken"])
    assert mine.status_code == 200
    ids = [r["id"] for r in mine.json()["data"]["content"]]
    assert review["id"] in ids


def test_rating_out_of_range_is_rejected(customer):
    r = post("/api/v1/reviews", token=customer["accessToken"], json={
        "shopId": SHOP_101, "customerName": "QA Automation Customer", "rating": 7,
    })
    assert r.status_code == 422
