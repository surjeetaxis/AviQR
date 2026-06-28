"""
AviQR QA — Session fixtures
All 12 user roles logged in once per test run via scope="session".
Fixtures are named to match the QA_VERIFICATION_REPORT role names.
"""
import uuid
import random
import pytest
from client import get, post
from config import SEED_USERS


# ─── helpers ──────────────────────────────────────────────────────────────────

def login(email: str, password: str) -> dict:
    r = post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} — {r.text}"
    body = r.json()
    assert body["success"] is True, f"success!=true for {email}"
    return body["data"]


def random_phone() -> str:
    """Random 10-digit Indian mobile number (starts with 6-9)."""
    return random.choice("6789") + "".join(random.choices("0123456789", k=9))


def random_email(prefix: str = "qa") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@aviqr-qa.test"


# ─── session-scoped role fixtures ─────────────────────────────────────────────

@pytest.fixture(scope="session")
def sessions():
    """Login every seeded user type once. Dict keyed by role name."""
    return {key: login(creds["email"], creds["password"]) for key, creds in SEED_USERS.items()}


@pytest.fixture(scope="session")
def admin(sessions):        return sessions["ADMIN"]

@pytest.fixture(scope="session")
def support(sessions):      return sessions["SUPPORT"]

@pytest.fixture(scope="session")
def owner(sessions):        return sessions["OWNER"]       # Spice Route — SHOP_101

@pytest.fixture(scope="session")
def owner2(sessions):       return sessions["OWNER2"]      # Coconut Grove — SHOP_102

@pytest.fixture(scope="session")
def owner3(sessions):       return sessions["OWNER3"]      # Cake Studio  — SHOP_104

@pytest.fixture(scope="session")
def manager(sessions):      return sessions["MANAGER"]     # Staff at SHOP_101

@pytest.fixture(scope="session")
def kitchen(sessions):      return sessions["KITCHEN"]     # Staff at SHOP_101

@pytest.fixture(scope="session")
def cashier(sessions):      return sessions["CASHIER"]     # Staff at SHOP_101

@pytest.fixture(scope="session")
def customer(sessions):     return sessions["CUSTOMER"]

@pytest.fixture(scope="session")
def hotel_owner(sessions):  return sessions["HOTEL"]

@pytest.fixture(scope="session")
def mall_admin(sessions):   return sessions["MALL"]

@pytest.fixture(scope="session")
def supplier(sessions):     return sessions["SUPPLIER"]
