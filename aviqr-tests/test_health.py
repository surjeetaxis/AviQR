"""Smoke tests: is the platform even up before we bother testing features on it."""
import requests

from config import EUREKA_URL, EXPECTED_SERVICES
from client import get


def test_eureka_is_up():
    r = requests.get(f"{EUREKA_URL}/actuator/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "UP"


def test_all_services_registered_with_eureka():
    r = requests.get(f"{EUREKA_URL}/eureka/apps", headers={"Accept": "application/json"}, timeout=10)
    assert r.status_code == 200
    apps = r.json().get("applications", {}).get("application", [])
    if isinstance(apps, dict):  # Eureka returns a dict instead of a list when there's exactly one app
        apps = [apps]
    registered = {a["name"] for a in apps}
    missing = [s for s in EXPECTED_SERVICES if s not in registered]
    assert not missing, f"Not registered with Eureka: {missing}"


def test_gateway_routes_to_a_protected_service():
    # No token -> the gateway's AuthenticationFilter must reject before it
    # even reaches shop-service.
    r = get("/api/v1/shops/00000000-0000-0000-0000-000000000101")
    assert r.status_code == 401


def test_gateway_routes_to_a_public_endpoint():
    # menu-service's public storefront route bypasses the auth filter entirely.
    r = get("/api/v1/menu/public/00000000-0000-0000-0000-000000000101")
    assert r.status_code == 200
