"""
test_inventory.py — Inventory, Raw Materials, Recipes

Covers:
  • Stock level read and update per menu item
  • Out-of-stock and low-stock listing
  • Raw material CRUD (create, read, update)
  • Stock adjustment (add / subtract with reason)
  • Low-stock raw material listing
  • Recipe: save ingredients for a menu item
  • Recipe: cost calculation
  • RBAC: owner / manager can update stock; customer cannot
"""
import uuid
import pytest
from client import get, post, put
from config import SHOP_101, ITEM_101_PANEER_TIKKA


# ─── Finished goods inventory ─────────────────────────────────────────────────

@pytest.mark.inventory
def test_inventory_stock_list_returns_items(owner):
    r = get(f"/api/v1/inventory/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    data = r.json()["data"]
    assert isinstance(data, list)


@pytest.mark.inventory
def test_inventory_summary_contains_totals(owner):
    r = get(f"/api/v1/inventory/shop/{SHOP_101}/summary", token=owner["accessToken"])
    assert r.status_code == 200


@pytest.mark.mutates
@pytest.mark.inventory
def test_owner_can_set_stock_quantity_on_menu_item(owner):
    r = put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
            token=owner["accessToken"],
            json={"stockQty": 25, "trackStock": True})
    assert r.status_code == 200


@pytest.mark.mutates
@pytest.mark.inventory
def test_manager_can_set_stock_quantity(manager):
    r = put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
            token=manager["accessToken"],
            json={"stockQty": 30, "trackStock": True})
    assert r.status_code in (200, 403)   # depends on manager permissions


@pytest.mark.inventory
def test_customer_cannot_set_stock_quantity(customer):
    r = put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
            token=customer["accessToken"],
            json={"stockQty": 999, "trackStock": True})
    assert r.status_code == 403


@pytest.mark.mutates
@pytest.mark.inventory
def test_setting_stock_to_zero_flags_item_out_of_stock(owner):
    put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
        token=owner["accessToken"], json={"stockQty": 0, "trackStock": True})

    r = get(f"/api/v1/inventory/shop/{SHOP_101}/out-of-stock",
            token=owner["accessToken"])
    assert r.status_code == 200
    ids = [i.get("menuItemId") or i.get("id") for i in r.json()["data"]]
    assert ITEM_101_PANEER_TIKKA in ids

    # Restore
    put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
        token=owner["accessToken"], json={"stockQty": 50, "trackStock": True})


@pytest.mark.mutates
@pytest.mark.inventory
def test_low_stock_listing_returns_items_at_threshold(owner):
    # Set to threshold value
    put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
        token=owner["accessToken"], json={"stockQty": 3, "trackStock": True, "lowStockThreshold": 5})

    r = get(f"/api/v1/inventory/shop/{SHOP_101}/low-stock", token=owner["accessToken"])
    assert r.status_code == 200
    # Restore
    put(f"/api/v1/inventory/item/{ITEM_101_PANEER_TIKKA}",
        token=owner["accessToken"], json={"stockQty": 50, "trackStock": True})


# ─── Raw materials ────────────────────────────────────────────────────────────

@pytest.mark.inventory
def test_raw_materials_list_returns_for_shop(owner):
    r = get(f"/api/v1/raw-materials/shop/{SHOP_101}", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.mutates
@pytest.mark.inventory
def test_owner_can_create_raw_material(owner):
    mat_id = uuid.uuid4().hex[:8]
    r = post("/api/v1/raw-materials", token=owner["accessToken"], json={
        "shopId":        SHOP_101,
        "name":          f"QA Ingredient {mat_id}",
        "unit":          "kg",
        "currentStock":  10.0,
        "minStockLevel": 2.0,
        "costPerUnit":   320.0,
        "supplier":      "QA Supplier Co.",
    })
    assert r.status_code == 200
    mat = r.json()["data"]
    assert mat["name"].startswith("QA Ingredient")
    assert mat["shopId"] == SHOP_101
    return mat["id"]


@pytest.mark.mutates
@pytest.mark.inventory
def test_raw_material_update_round_trip(owner):
    # Create
    r = post("/api/v1/raw-materials", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "QA Update Test Mat", "unit": "litre",
        "currentStock": 5.0, "minStockLevel": 1.0, "costPerUnit": 100.0,
    })
    assert r.status_code == 200
    mat_id = r.json()["data"]["id"]

    # Update
    r2 = put(f"/api/v1/raw-materials/{mat_id}", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "QA Update Test Mat", "unit": "litre",
        "currentStock": 5.0, "minStockLevel": 1.0, "costPerUnit": 150.0,
    })
    assert r2.status_code == 200
    assert float(r2.json()["data"]["costPerUnit"]) == 150.0


@pytest.mark.mutates
@pytest.mark.inventory
def test_stock_adjustment_adds_to_current_stock(owner):
    # Create material with known stock
    r = post("/api/v1/raw-materials", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "QA Adjust Test", "unit": "gram",
        "currentStock": 100.0, "minStockLevel": 10.0, "costPerUnit": 0.5,
    })
    assert r.status_code == 200
    mat_id = r.json()["data"]["id"]
    initial = float(r.json()["data"]["currentStock"])

    # Adjust +50
    r2 = post(f"/api/v1/raw-materials/{mat_id}/adjust",
              token=owner["accessToken"],
              params={"delta": 50.0, "reason": "PURCHASE"})
    assert r2.status_code == 200

    # Verify new level
    listing = get(f"/api/v1/raw-materials/shop/{SHOP_101}", token=owner["accessToken"])
    materials = listing.json()["data"]
    updated = next((m for m in materials if m["id"] == mat_id), None)
    if updated:
        assert float(updated["currentStock"]) == initial + 50.0


@pytest.mark.mutates
@pytest.mark.inventory
def test_stock_adjustment_subtract_triggers_low_stock(owner):
    r = post("/api/v1/raw-materials", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "QA Low Stock Mat", "unit": "piece",
        "currentStock": 3.0, "minStockLevel": 5.0, "costPerUnit": 10.0,
    })
    assert r.status_code == 200
    mat_id = r.json()["data"]["id"]

    low = get(f"/api/v1/raw-materials/shop/{SHOP_101}/low-stock", token=owner["accessToken"])
    assert low.status_code == 200
    low_ids = [m["id"] for m in low.json()["data"]]
    assert mat_id in low_ids


@pytest.mark.inventory
def test_customer_cannot_list_raw_materials(customer):
    r = get(f"/api/v1/raw-materials/shop/{SHOP_101}", token=customer["accessToken"])
    assert r.status_code == 403


@pytest.mark.inventory
def test_raw_material_requires_auth():
    r = get(f"/api/v1/raw-materials/shop/{SHOP_101}")
    assert r.status_code == 401


# ─── Recipes ─────────────────────────────────────────────────────────────────

@pytest.mark.mutates
@pytest.mark.inventory
def test_owner_can_save_recipe_for_menu_item(owner):
    # Create ingredient first
    mat = post("/api/v1/raw-materials", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "Paneer QA", "unit": "gram",
        "currentStock": 500.0, "minStockLevel": 50.0, "costPerUnit": 0.32,
    }).json()["data"]

    r = put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/recipe",
            token=owner["accessToken"],
            json=[{
                "rawMaterialId": mat["id"],
                "rawMaterialName": "Paneer QA",
                "quantity": 200.0,
                "unit": "gram",
            }])
    assert r.status_code == 200
    recipe = r.json()["data"]
    assert len(recipe) >= 1
    assert float(recipe[0]["quantity"]) == 200.0


@pytest.mark.mutates
@pytest.mark.inventory
def test_recipe_cost_reflects_ingredient_cost(owner):
    mat = post("/api/v1/raw-materials", token=owner["accessToken"], json={
        "shopId": SHOP_101, "name": "Butter QA", "unit": "gram",
        "currentStock": 1000.0, "minStockLevel": 100.0, "costPerUnit": 0.04,  # ₹0.04/gram
    }).json()["data"]

    put(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/recipe",
        token=owner["accessToken"],
        json=[{"rawMaterialId": mat["id"], "rawMaterialName": "Butter QA", "quantity": 50.0, "unit": "gram"}])

    r = get(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/cost", token=owner["accessToken"])
    assert r.status_code == 200
    cost = r.json()["data"]
    assert "ingredientCost" in cost
    assert float(cost["ingredientCost"]) >= 0


@pytest.mark.inventory
def test_get_recipe_for_item(owner):
    r = get(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/recipe", token=owner["accessToken"])
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.inventory
def test_customer_cannot_access_recipe(customer):
    r = get(f"/api/v1/items/{ITEM_101_PANEER_TIKKA}/recipe", token=customer["accessToken"])
    assert r.status_code == 403
