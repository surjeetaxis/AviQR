import uuid

import pytest

from client import get, post
from config import SHOP_101


@pytest.mark.mutates
def test_create_razorpay_order_returns_checkout_payload(customer):
    order_id = f"ORD-QA-{uuid.uuid4().hex[:10]}"
    r = post("/api/v1/payments/create-order", token=customer["accessToken"], json={
        "orderId": order_id, "amount": 100.00, "currency": "INR",
        "shopId": SHOP_101, "customerId": customer["userId"],
    })
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["razorpayOrderId"].startswith("order_")
    assert data["amount"] == 10000  # paise


@pytest.mark.mutates
def test_verify_with_bad_signature_is_not_verified(customer):
    # A fresh, never-before-used orderId: payment-service's verify() looks up
    # the payment by orderId expecting exactly one row, so reusing a fixed ID
    # across repeated test runs would create duplicates and break the lookup.
    order_id = f"ORD-QA-{uuid.uuid4().hex[:10]}"
    create = post("/api/v1/payments/create-order", token=customer["accessToken"], json={
        "orderId": order_id, "amount": 50.00, "currency": "INR",
        "shopId": SHOP_101, "customerId": customer["userId"],
    })
    assert create.status_code == 200

    r = post("/api/v1/payments/verify", token=customer["accessToken"], json={
        "orderId": order_id,
        "razorpayOrderId": create.json()["data"]["razorpayOrderId"],
        "razorpayPaymentId": f"pay_qa_{uuid.uuid4().hex[:10]}",  # payment_id has a UNIQUE constraint
        "razorpaySignature": "not-a-real-signature",
    })
    assert r.status_code == 200  # endpoint always 200s; check the verified flag instead
    assert r.json()["data"]["verified"] is False


def test_webhook_endpoint_is_public_and_acknowledges():
    r = post("/api/v1/payments/webhook/razorpay", json={"event": "payment.captured"})
    assert r.status_code == 200


def test_owner_can_list_shop_payments(owner):
    r = get(f"/api/v1/payments/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["totalElements"] >= 5  # hand-written demo payments for this shop


def test_only_admin_can_view_cross_tenant_payments(owner, admin):
    r = get("/api/v1/payments", token=owner["accessToken"])
    assert r.status_code == 403

    r2 = get("/api/v1/payments", token=admin["accessToken"])
    assert r2.status_code == 200
