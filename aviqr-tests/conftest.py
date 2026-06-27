import pytest

from client import post
from config import SEED_USERS


def login(email, password):
    r = post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    body = r.json()
    assert body["success"] is True
    return body["data"]


@pytest.fixture(scope="session")
def sessions():
    """Logs in as every seeded user type once per test run."""
    return {key: login(creds["email"], creds["password"]) for key, creds in SEED_USERS.items()}


@pytest.fixture(scope="session")
def admin(sessions):
    return sessions["ADMIN"]


@pytest.fixture(scope="session")
def support(sessions):
    return sessions["SUPPORT"]


@pytest.fixture(scope="session")
def owner(sessions):
    return sessions["OWNER"]


@pytest.fixture(scope="session")
def owner2(sessions):
    return sessions["OWNER2"]


@pytest.fixture(scope="session")
def owner3(sessions):
    return sessions["OWNER3"]


@pytest.fixture(scope="session")
def manager(sessions):
    return sessions["MANAGER"]


@pytest.fixture(scope="session")
def kitchen(sessions):
    return sessions["KITCHEN"]


@pytest.fixture(scope="session")
def cashier(sessions):
    return sessions["CASHIER"]


@pytest.fixture(scope="session")
def customer(sessions):
    return sessions["CUSTOMER"]


@pytest.fixture(scope="session")
def hotel_owner(sessions):
    return sessions["HOTEL"]


@pytest.fixture(scope="session")
def mall_admin(sessions):
    return sessions["MALL"]


@pytest.fixture(scope="session")
def supplier(sessions):
    return sessions["SUPPLIER"]
