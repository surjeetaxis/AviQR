import random
import uuid

import pytest

from client import get, post, put
from config import SEED_USERS, SUSPENDED_USER


def random_indian_phone():
    return random.choice("6789") + "".join(random.choices("0123456789", k=9))


def test_login_succeeds_for_every_seeded_user_type(sessions):
    """One login per user type the platform supports — the core of "all user types"."""
    for role, data in sessions.items():
        assert data["accessToken"], f"{role} got no access token back"
        assert data["role"], f"{role} got no role claim back"


def test_login_wrong_password():
    r = post("/api/v1/auth/login", json={
        "email": SEED_USERS["CUSTOMER"]["email"], "password": "DefinitelyWrongPass1",
    })
    assert r.status_code == 400
    assert r.json()["success"] is False


def test_login_unknown_email():
    r = post("/api/v1/auth/login", json={
        "email": f"no-such-user-{uuid.uuid4().hex[:8]}@example.com", "password": "Whatever123",
    })
    assert r.status_code == 400


def test_login_suspended_account_is_rejected():
    r = post("/api/v1/auth/login", json=SUSPENDED_USER)
    assert r.status_code == 400
    assert "suspended" in r.json()["message"].lower()


def test_login_missing_password_is_validation_error():
    r = post("/api/v1/auth/login", json={"email": SEED_USERS["CUSTOMER"]["email"]})
    assert r.status_code == 422


@pytest.mark.mutates
def test_register_new_customer_then_login_with_it():
    email = f"qa-{uuid.uuid4().hex[:10]}@example.com"
    r = post("/api/v1/auth/register", json={
        "name": "QA Automation Customer",
        "email": email,
        "phone": random_indian_phone(),
        "password": "Axis321#",
        "role": "CUSTOMER",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["success"] is True
    assert body["data"]["accessToken"]
    assert body["data"]["email"] == email

    r2 = post("/api/v1/auth/login", json={"email": email, "password": "Axis321#"})
    assert r2.status_code == 200
    assert r2.json()["data"]["role"] == "CUSTOMER"


def test_register_duplicate_email_is_rejected():
    r = post("/api/v1/auth/register", json={
        "name": "Duplicate Attempt",
        "email": SEED_USERS["CUSTOMER"]["email"],
        "phone": random_indian_phone(),
        "password": "Axis321#",
        "role": "CUSTOMER",
    })
    assert r.status_code == 400


def test_profile_requires_auth():
    r = get("/api/v1/auth/profile")
    assert r.status_code == 401


def test_profile_returns_the_logged_in_user(customer):
    r = get("/api/v1/auth/profile", token=customer["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["email"] == SEED_USERS["CUSTOMER"]["email"]


def test_admin_can_list_all_users(admin):
    r = get("/api/v1/auth/admin/users", token=admin["accessToken"])
    assert r.status_code == 200
    page = r.json()["data"]
    assert page["totalElements"] >= len(SEED_USERS)


def test_admin_can_view_user_stats(admin):
    r = get("/api/v1/auth/admin/users/stats", token=admin["accessToken"])
    assert r.status_code == 200
    assert r.json()["data"]["total"] >= len(SEED_USERS)


def test_support_can_also_list_users(support):
    r = get("/api/v1/auth/admin/users", token=support["accessToken"])
    assert r.status_code == 200


def test_non_admin_non_support_cannot_list_users(owner, customer):
    for caller in (owner, customer):
        r = get("/api/v1/auth/admin/users", token=caller["accessToken"])
        assert r.status_code == 403


def test_only_admin_can_change_a_users_status(admin, support):
    # Verifying the boundary itself, not actually flipping anyone's status:
    # SUPPORT can list/view users but the controller restricts status/role
    # changes and deletion to ADMIN only.
    target_id = admin["userId"]
    r = put(
        f"/api/v1/auth/admin/users/{target_id}/status",
        token=support["accessToken"],
        params={"status": "ACTIVE"},
    )
    assert r.status_code == 403


def test_send_otp_returns_ok():
    # A fresh phone each run — sendOtp is rate-limited to 3 requests per phone
    # per 10 minutes, so reusing one fixed number would fail on repeated runs.
    sent = post("/api/v1/auth/otp/send", json={"phone": random_indian_phone()})
    assert sent.status_code == 200


@pytest.mark.mutates
def test_login_with_dev_otp_bypass():
    # Local/dev profile fixes the OTP at 123456 (app.otp.dev-mode), bypassing
    # the need for a real OTP record entirely — so no /otp/send call needed
    # (and none made, to stay clear of its rate limit).
    login = post("/api/v1/auth/otp/login", json={"phone": "9876543210", "otp": "123456"})
    assert login.status_code == 200
    assert login.json()["data"]["role"] == "CUSTOMER"


def test_otp_login_with_wrong_code_is_rejected():
    r = post("/api/v1/auth/otp/login", json={"phone": "9876543210", "otp": "000001"})
    assert r.status_code == 400


@pytest.mark.mutates
def test_refresh_token_round_trip():
    login = post("/api/v1/auth/login", json=SEED_USERS["CUSTOMER"])
    refresh_token = login.json()["data"]["refreshToken"]

    r = post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert r.status_code == 200
    assert r.json()["data"]["accessToken"]


def test_refresh_with_garbage_token_is_rejected():
    r = post("/api/v1/auth/refresh", json={"refreshToken": "not-a-real-refresh-token"})
    assert r.status_code == 400


@pytest.mark.mutates
def test_logout_revokes_the_refresh_token():
    login = post("/api/v1/auth/login", json=SEED_USERS["CUSTOMER"])
    data = login.json()["data"]

    out = post("/api/v1/auth/logout", token=data["accessToken"])
    assert out.status_code == 200

    r = post("/api/v1/auth/refresh", json={"refreshToken": data["refreshToken"]})
    assert r.status_code == 400


@pytest.mark.mutates
def test_update_profile_round_trip(customer):
    """Update preferredLanguage then restore it — own profile, no other endpoint touches this field."""
    original = get("/api/v1/auth/profile", token=customer["accessToken"]).json()["data"]

    r = put("/api/v1/auth/profile", token=customer["accessToken"], json={
        "name": original["name"], "preferredLanguage": "ta",
    })
    assert r.status_code == 200
    assert r.json()["data"]["preferredLanguage"] == "ta"

    restore = put("/api/v1/auth/profile", token=customer["accessToken"], json={
        "name": original["name"], "preferredLanguage": original["preferredLanguage"],
    })
    assert restore.status_code == 200


@pytest.mark.mutates
def test_update_language_endpoint(customer):
    original = get("/api/v1/auth/profile", token=customer["accessToken"]).json()["data"]

    r = put("/api/v1/auth/language", token=customer["accessToken"], params={"lang": "hi"})
    assert r.status_code == 200

    put("/api/v1/auth/language", token=customer["accessToken"],
        params={"lang": original["preferredLanguage"]})


@pytest.mark.mutates
def test_change_password_on_a_fresh_account():
    """Uses a throwaway registered account, not a shared seeded login — changing
    a seeded user's password would break every other test that logs in as them."""
    email = f"qa-pwchange-{uuid.uuid4().hex[:10]}@example.com"
    register = post("/api/v1/auth/register", json={
        "name": "QA Password Change", "email": email, "phone": random_indian_phone(),
        "password": "Axis321#", "role": "CUSTOMER",
    })
    token = register.json()["data"]["accessToken"]

    changed = put("/api/v1/auth/change-password", token=token, json={
        "currentPassword": "Axis321#", "newPassword": "NewTest@5678",
    })
    assert changed.status_code == 200

    old_login = post("/api/v1/auth/login", json={"email": email, "password": "Axis321#"})
    assert old_login.status_code == 400

    new_login = post("/api/v1/auth/login", json={"email": email, "password": "NewTest@5678"})
    assert new_login.status_code == 200


def test_change_password_with_wrong_current_password_is_rejected(customer):
    r = put("/api/v1/auth/change-password", token=customer["accessToken"], json={
        "currentPassword": "DefinitelyWrong1", "newPassword": "WhateverNew@123",
    })
    assert r.status_code == 400
