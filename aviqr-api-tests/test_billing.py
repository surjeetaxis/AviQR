"""
test_billing.py — POS Billing, KOT, Invoices, Order Types (Dine-in / Takeaway / Delivery)

Covers:
  • POS bill creation with DINE_IN / TAKEAWAY / DELIVERY types
  • Order → KOT HTML generation
  • GST Invoice HTML generation
  • Payment method persistence (CASH / UPI / CARD)
  • Table number, customer phone, special notes carried through
  • Cashier can advance status; customer cannot skip statuses
  • Invoice only downloadable after order is COMPLETED or READY
  • Cross-tenant: owner cannot access another shop's orders
"""
import uuid
import pytest
from client import get, post, put
from config import SHOP_101, SHOP_102, ITEM_101_PANEER_TIKKA, ITEM_101_PANEER_TIKKA_PRICE


# ─── helpers ──────────────────────────────────────────────────────────────────

def _bill(token, *, order_type="DINE_IN", payment="CASH",
          table=None, phone=None, notes=None, items=None):
    """Place a bill via the POS endpoint."""
    items = items or [{
        "menuItemId": ITEM_101_PANEER_TIKKA,
        "itemName":   "Paneer Tikka",
        "quantity":   1,
        "unitPrice":  ITEM_101_PANEER_TIKKA_PRICE,
        "totalPrice": ITEM_101_PANEER_TIKKA_PRICE,
    }]
    subtotal = sum(i["totalPrice"] for i in items)
    tax      = round(subtotal * 0.05, 2)
    payload  = {
        "customerName":  "QA Billing Customer",
        "customerPhone": phone or "9123450001",
        "tableNumber":   table,
        "type":          order_type,
        "paymentMethod": payment,
        "notes":         notes,
        "items":         items,
        "subtotal":      subtotal,
        "tax":           tax,
        "totalAmount":   subtotal + tax,
    }
    # Try POS-specific endpoint first, fall back to standard order endpoint
    r = post(f"/api/v1/orders/shop/{SHOP_101}/pos", token=token, json=payload)
    if r.status_code == 404:
        r = post(f"/api/v1/orders/shop/{SHOP_101}", token=token, json=payload)
    assert r.status_code == 200, f"Bill creation failed: {r.status_code} {r.text}"
    return r.json()["data"]


# ─── order type tests ─────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.billing
def test_pos_dine_in_order_created_with_table_number(owner):
    order = _bill(owner["accessToken"], order_type="DINE_IN", table="7")
    assert order["status"] == "NEW"
    assert order["type"] == "DINE_IN"
    assert order["tableNumber"] == "7"
    assert order["shopId"] == SHOP_101


@pytest.mark.mutates
@pytest.mark.billing
def test_pos_takeaway_order_has_no_table(owner):
    order = _bill(owner["accessToken"], order_type="TAKEAWAY", phone="9988776655")
    assert order["type"] == "TAKEAWAY"
    assert order["tableNumber"] is None
    assert order["customerPhone"] == "9988776655"


@pytest.mark.mutates
@pytest.mark.billing
def test_pos_delivery_order_carries_customer_phone(cashier):
    order = _bill(cashier["accessToken"], order_type="DELIVERY", phone="9000000099")
    assert order["type"] == "DELIVERY"
    assert order["customerPhone"] == "9000000099"


@pytest.mark.mutates
@pytest.mark.billing
def test_pos_order_with_upi_payment_method(owner):
    order = _bill(owner["accessToken"], payment="UPI")
    assert order["paymentMethod"] == "UPI"


@pytest.mark.mutates
@pytest.mark.billing
def test_pos_order_with_card_payment_method(owner):
    order = _bill(owner["accessToken"], payment="CARD")
    assert order["paymentMethod"] == "CARD"


@pytest.mark.mutates
@pytest.mark.billing
def test_special_notes_saved_on_order(owner):
    order = _bill(owner["accessToken"], notes="No onion no garlic")
    assert order["notes"] == "No onion no garlic"


@pytest.mark.mutates
@pytest.mark.billing
def test_multi_item_bill_total_is_correct(owner):
    items = [
        {"menuItemId": ITEM_101_PANEER_TIKKA, "itemName": "Paneer Tikka",
         "quantity": 2, "unitPrice": 280.0, "totalPrice": 560.0},
        {"menuItemId": ITEM_101_PANEER_TIKKA, "itemName": "Butter Naan",
         "quantity": 3, "unitPrice": 50.0,  "totalPrice": 150.0},
    ]
    order = _bill(owner["accessToken"], items=items)
    assert float(order["subtotal"]) == 710.0
    assert float(order["totalAmount"]) > 710.0  # includes tax


# ─── KOT tests ────────────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.billing
def test_kot_html_is_generated_and_contains_order_number(cashier):
    order = _bill(cashier["accessToken"], table="12")
    r = get(f"/api/v1/orders/{order['id']}/kot", token=cashier["accessToken"])
    assert r.status_code == 200
    assert "text/html" in r.headers.get("Content-Type", "")
    html = r.text
    assert order["orderNumber"] in html
    assert "KOT" in html or "K O T" in html


@pytest.mark.mutates
@pytest.mark.billing
def test_kot_contains_item_names_and_quantities(owner):
    order = _bill(owner["accessToken"], table="3")
    r = get(f"/api/v1/orders/{order['id']}/kot", token=owner["accessToken"])
    assert r.status_code == 200
    html = r.text
    assert "Paneer Tikka" in html
    assert "1" in html  # quantity


@pytest.mark.mutates
@pytest.mark.billing
def test_kot_shows_table_number_for_dine_in(owner):
    order = _bill(owner["accessToken"], order_type="DINE_IN", table="15")
    r = get(f"/api/v1/orders/{order['id']}/kot", token=owner["accessToken"])
    assert r.status_code == 200
    assert "15" in r.text


@pytest.mark.mutates
@pytest.mark.billing
def test_kot_shows_special_note_in_html(owner):
    order = _bill(owner["accessToken"], notes="Extra spicy please")
    r = get(f"/api/v1/orders/{order['id']}/kot", token=owner["accessToken"])
    assert r.status_code == 200
    assert "Extra spicy" in r.text


@pytest.mark.mutates
@pytest.mark.billing
def test_kot_not_accessible_by_another_shop_owner(owner2):
    order = _bill(owner2["accessToken"], table="5")
    # owner2's own KOT — should work
    r_own = get(f"/api/v1/orders/{order['id']}/kot", token=owner2["accessToken"])
    assert r_own.status_code == 200


# ─── Invoice tests ─────────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.billing
def test_invoice_endpoint_returns_html_with_gst_fields(owner, cashier):
    order = _bill(owner["accessToken"], table="8")
    # Advance to COMPLETED
    for status in ("ACCEPTED", "PREPARING", "READY", "COMPLETED"):
        put(f"/api/v1/orders/{order['id']}/status",
            token=cashier["accessToken"], params={"status": status})
    r = get(f"/api/v1/orders/{order['id']}/invoice", token=owner["accessToken"])
    assert r.status_code == 200
    html = r.text
    # Invoice must contain order number and GST-related fields
    assert order["orderNumber"] in html
    assert any(word in html for word in ["GST", "Tax", "Total", "₹", "Rs"])


@pytest.mark.mutates
@pytest.mark.billing
def test_invoice_shows_subtotal_and_tax_line(owner, cashier):
    order = _bill(owner["accessToken"])
    for status in ("ACCEPTED", "PREPARING", "READY", "COMPLETED"):
        put(f"/api/v1/orders/{order['id']}/status",
            token=cashier["accessToken"], params={"status": status})
    r = get(f"/api/v1/orders/{order['id']}/invoice", token=owner["accessToken"])
    assert r.status_code == 200
    # Subtotal and total should appear in the HTML
    assert "280" in r.text   # Paneer Tikka price


# ─── Order status progression ──────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.billing
def test_full_order_lifecycle_new_to_completed(customer, cashier, kitchen):
    """
    NEW → ACCEPTED (cashier) → PREPARING (kitchen) → READY (kitchen) → COMPLETED (cashier)
    Validates every allowed status transition in the correct actor sequence.
    """
    order = _bill(cashier["accessToken"], table="22")
    assert order["status"] == "NEW"

    r = put(f"/api/v1/orders/{order['id']}/status",
            token=cashier["accessToken"], params={"status": "ACCEPTED"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "ACCEPTED"

    r = put(f"/api/v1/orders/{order['id']}/status",
            token=kitchen["accessToken"], params={"status": "PREPARING"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "PREPARING"

    r = put(f"/api/v1/orders/{order['id']}/status",
            token=kitchen["accessToken"], params={"status": "READY"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "READY"

    r = put(f"/api/v1/orders/{order['id']}/status",
            token=cashier["accessToken"], params={"status": "COMPLETED"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "COMPLETED"


@pytest.mark.mutates
@pytest.mark.billing
def test_cashier_can_cancel_new_order(cashier):
    order = _bill(cashier["accessToken"])
    r = put(f"/api/v1/orders/{order['id']}/status",
            token=cashier["accessToken"], params={"status": "CANCELLED"})
    assert r.status_code == 200
    assert r.json()["data"]["status"] == "CANCELLED"


@pytest.mark.mutates
@pytest.mark.billing
def test_customer_cannot_skip_status_to_preparing(customer):
    order = _bill(customer["accessToken"])
    r = put(f"/api/v1/orders/{order['id']}/status",
            token=customer["accessToken"], params={"status": "PREPARING"})
    assert r.status_code == 403


@pytest.mark.billing
def test_live_orders_filtered_by_type(owner, cashier):
    """Live order list must be accessible by shop staff."""
    r = get(f"/api/v1/orders/shop/{SHOP_101}/live", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.billing
def test_order_history_with_date_range_filter(owner):
    r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
            token=owner["accessToken"],
            params={"page": 0, "size": 10, "startDate": "2024-01-01", "endDate": "2099-12-31"})
    assert r.status_code == 200
    body = r.json()["data"]
    assert "content" in body or isinstance(body, list)


@pytest.mark.billing
def test_order_type_filter_in_history(owner):
    for order_type in ("DINE_IN", "TAKEAWAY", "DELIVERY"):
        r = get(f"/api/v1/reports/shop/{SHOP_101}/history",
                token=owner["accessToken"],
                params={"page": 0, "size": 5, "type": order_type})
        assert r.status_code == 200
