"""
AviQR QA — Sessions/device tracking, real impersonation, admin user PATCH,
and support analytics.

Covers auth-service/support-service surface added after the original 250-test
suite was written (see API_REFERENCE.md in aviqr-backend for the full
contract): device/platform session tracking on login, the support-service ->
auth-service internal impersonation-token mint (previously this only wrote an
audit-log row; now it mints an actual short-lived usable token), the general
admin/support user-update endpoint, and support-service's cross-cutting
analytics endpoints (users/sessions/tickets/revenue in one place).
"""
import random
import uuid

import pytest

from client import get, post, patch
from config import SEED_USERS


def random_indian_phone():
    return random.choice("6789") + "".join(random.choices("0123456789", k=9))


def register_throwaway_customer(name="QA Automation Customer"):
    """A fresh, disposable CUSTOMER account — used as the *target* of session
    revocation / impersonation / profile edits in these tests, so nothing here
    ever touches the shared session-scoped fixtures other test files in this
    suite depend on for the whole run (see test_auth.py's
    test_change_password_on_a_fresh_account for the same precaution)."""
    email = f"qa-{uuid.uuid4().hex[:10]}@example.com"
    r = post("/api/v1/auth/register", json={
        "name": name, "email": email, "phone": random_indian_phone(),
        "password": "Axis321#", "role": "CUSTOMER",
    })
    assert r.status_code == 200, r.text
    return r.json()["data"]


# ─── Session / device tracking ────────────────────────────────────────────────

@pytest.mark.mutates
def test_login_with_platform_header_returns_session_fields():
    r = post("/api/v1/auth/login", json=SEED_USERS["CUSTOMER"],
              headers={"X-Platform": "ANDROID", "X-Device-Model": "QA-Test-Device"})
    assert r.status_code == 200
    data = r.json()["data"]
    assert data["sessionId"]
    assert data["platform"] == "ANDROID"
    assert data["accountStatus"] == "ACTIVE"
    assert "emailVerified" in data and "phoneVerified" in data


def test_login_without_platform_header_defaults_to_unknown():
    r = post("/api/v1/auth/login", json=SEED_USERS["CUSTOMER"])
    assert r.status_code == 200
    assert r.json()["data"]["platform"] == "UNKNOWN"


@pytest.mark.mutates
def test_admin_can_list_a_users_sessions(admin):
    target = register_throwaway_customer("QA Session List Target")
    login = post("/api/v1/auth/login", json={"email": target["email"], "password": "Axis321#"},
                  headers={"X-Platform": "IOS"})
    assert login.status_code == 200

    r = get(f"/api/v1/auth/admin/users/{target['userId']}/sessions", token=admin["accessToken"])
    assert r.status_code == 200
    sessions = r.json()["data"]["content"]
    assert len(sessions) >= 1
    assert any(s["platform"] == "IOS" for s in sessions)


def test_non_admin_non_support_cannot_list_sessions(owner, customer):
    r = get(f"/api/v1/auth/admin/users/{customer['userId']}/sessions", token=owner["accessToken"])
    assert r.status_code == 403


@pytest.mark.mutates
def test_admin_can_revoke_a_single_session_without_affecting_others(admin):
    target = register_throwaway_customer("QA Single Revoke Target")
    login_a = post("/api/v1/auth/login", json={"email": target["email"], "password": "Axis321#"},
                    headers={"X-Platform": "WEB"})
    login_b = post("/api/v1/auth/login", json={"email": target["email"], "password": "Axis321#"},
                    headers={"X-Platform": "ANDROID"})
    session_a = login_a.json()["data"]["sessionId"]
    session_b = login_b.json()["data"]["sessionId"]

    revoke = post(f"/api/v1/auth/admin/users/{target['userId']}/sessions/{session_a}/revoke",
                   token=admin["accessToken"])
    assert revoke.status_code == 200

    listing = get(f"/api/v1/auth/admin/users/{target['userId']}/sessions",
                   token=admin["accessToken"]).json()["data"]["content"]
    by_id = {s["id"]: s for s in listing}
    assert by_id[session_a]["revoked"] is True
    assert by_id[session_b]["revoked"] is False


@pytest.mark.mutates
def test_admin_can_revoke_all_sessions_for_a_user(admin):
    target = register_throwaway_customer("QA Revoke All Target")
    post("/api/v1/auth/login", json={"email": target["email"], "password": "Axis321#"})
    post("/api/v1/auth/login", json={"email": target["email"], "password": "Axis321#"})

    revoke_all = post(f"/api/v1/auth/admin/users/{target['userId']}/sessions/revoke-all",
                       token=admin["accessToken"])
    assert revoke_all.status_code == 200

    listing = get(f"/api/v1/auth/admin/users/{target['userId']}/sessions",
                   token=admin["accessToken"]).json()["data"]["content"]
    assert len(listing) >= 2
    assert all(s["revoked"] for s in listing)


# ─── Real impersonation ─────────────────────────────────────────────────────

@pytest.mark.mutates
def test_impersonation_mints_a_real_usable_token(support):
    """Previously this endpoint only wrote a log row with no functional effect;
    it now mints a real, short-lived (30 min) access token that authenticates
    as the target user — this is the core regression to guard."""
    target = register_throwaway_customer("QA Impersonation Target")

    start = post("/api/v1/support/impersonate", token=support["accessToken"], json={
        "agentName": "QA Automation Agent",
        "targetUserId": target["userId"],
        "targetUserName": target["name"],
        "reason": "Automated test of real impersonation token minting",
    })
    assert start.status_code == 200
    body = start.json()["data"]
    assert body["accessToken"]
    assert body["targetUserId"] == target["userId"]
    assert body["targetUserRole"] == "CUSTOMER"
    assert body["expiresIn"] == 1800

    profile = get("/api/v1/auth/profile", token=body["accessToken"])
    assert profile.status_code == 200
    assert profile.json()["data"]["id"] == target["userId"]


@pytest.mark.mutates
def test_ending_impersonation_marks_the_session_revoked(support, admin):
    """Note: ending impersonation revokes the session record (visible via the
    admin sessions endpoint and asserted here), but — because the gateway does
    stateless JWT validation (signature + expiry only, no DB lookup) — the
    already-issued access token itself keeps working until its natural 30-min
    expiry. This is documented, current, platform-wide behavior (revoking a
    refresh token has never invalidated an already-issued access token for any
    role), not something to "fix" here without a wider architecture change
    (e.g. a gateway-side revocation cache)."""
    target = register_throwaway_customer("QA Impersonation End Target")

    start = post("/api/v1/support/impersonate", token=support["accessToken"], json={
        "agentName": "QA Automation Agent", "targetUserId": target["userId"],
        "targetUserName": target["name"], "reason": "Automated end-impersonation test",
    })
    log_id = start.json()["data"]["impersonationLogId"]

    end = post(f"/api/v1/support/impersonate/{log_id}/end", token=support["accessToken"])
    assert end.status_code == 200

    sessions = get(f"/api/v1/auth/admin/users/{target['userId']}/sessions",
                    token=admin["accessToken"]).json()["data"]["content"]
    assert any(s["revoked"] is True for s in sessions)


@pytest.mark.security
def test_non_support_non_admin_cannot_start_impersonation(owner, customer):
    r = post("/api/v1/support/impersonate", token=owner["accessToken"], json={
        "targetUserId": customer["userId"], "targetUserName": "x", "reason": "should be forbidden",
    })
    assert r.status_code == 403


# ─── Admin/support account editing ──────────────────────────────────────────

@pytest.mark.mutates
def test_support_can_patch_a_customers_profile_fields(support):
    target = register_throwaway_customer("Original Name")

    r = patch(f"/api/v1/auth/admin/users/{target['userId']}", token=support["accessToken"], json={
        "name": "Corrected Name", "preferredLanguage": "hi",
    })
    assert r.status_code == 200
    assert r.json()["data"]["name"] == "Corrected Name"
    assert r.json()["data"]["preferredLanguage"] == "hi"

    fetched = get(f"/api/v1/auth/admin/users/{target['userId']}", token=support["accessToken"]).json()["data"]
    assert fetched["name"] == "Corrected Name"
    assert fetched["preferredLanguage"] == "hi"
    # avatar/preferredLanguage regression guard — AdminUserController.getUser() previously
    # used its own toDto() mapping that silently dropped these two fields.
    assert "avatar" in fetched


@pytest.mark.security
def test_non_admin_non_support_cannot_patch_a_user(owner, customer):
    r = patch(f"/api/v1/auth/admin/users/{customer['userId']}", token=owner["accessToken"],
              json={"name": "Hacked"})
    assert r.status_code == 403


# ─── Support analytics ───────────────────────────────────────────────────────

@pytest.mark.analytics
def test_support_analytics_overview_returns_expected_shape(support):
    r = get("/api/v1/support/analytics/overview", token=support["accessToken"])
    assert r.status_code == 200
    data = r.json()["data"]
    for key in ("usersByRole", "usersByStatus", "activeSessionsByPlatform",
                "ticketsByStatus", "ticketsByPriority", "impersonationCount", "platformRevenue"):
        assert key in data


@pytest.mark.analytics
def test_support_analytics_logins_by_platform(support):
    r = get("/api/v1/support/analytics/logins", token=support["accessToken"], params={"days": 7})
    assert r.status_code == 200
    assert isinstance(r.json()["data"], list)


@pytest.mark.analytics
def test_support_analytics_tickets_breakdown(admin):
    r = get("/api/v1/support/analytics/tickets", token=admin["accessToken"])
    assert r.status_code == 200
    data = r.json()["data"]
    assert "byStatus" in data and "byPriority" in data and "total" in data


@pytest.mark.security
def test_non_support_non_admin_cannot_view_analytics(owner, customer):
    for caller in (owner, customer):
        r = get("/api/v1/support/analytics/overview", token=caller["accessToken"])
        assert r.status_code == 403
