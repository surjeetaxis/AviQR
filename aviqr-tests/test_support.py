import pytest
from client import get, post, put


@pytest.mark.mutates
def test_customer_creates_ticket_and_support_sees_it(customer, support):
    create = post("/api/v1/tickets", token=customer["accessToken"], json={
        "subject": "QA automation test ticket", "description": "Created by the automated test suite.",
        "priority": "LOW",
    })
    assert create.status_code == 200
    ticket = create.json()["data"]
    assert ticket["status"] == "OPEN"

    listing = get("/api/v1/tickets", token=support["accessToken"], params={"page": 0, "size": 50})
    assert listing.status_code == 200
    ids = [t["id"] for t in listing.json()["data"]["content"]]
    assert ticket["id"] in ids

    assign = put(f"/api/v1/tickets/{ticket['id']}/assign", token=support["accessToken"],
                 params={"agentId": support["userId"]})
    assert assign.status_code == 200

    resolve = put(f"/api/v1/tickets/{ticket['id']}/status", token=support["accessToken"],
                  params={"status": "RESOLVED", "resolution": "Closed by QA automation."})
    assert resolve.status_code == 200
    assert resolve.json()["data"]["status"] == "RESOLVED"


@pytest.mark.mutates
def test_customer_can_view_their_own_ticket_but_not_the_queue(customer):
    create = post("/api/v1/tickets", token=customer["accessToken"], json={
        "subject": "Another QA ticket", "description": "x", "priority": "LOW",
    })
    ticket_id = create.json()["data"]["id"]

    own = get(f"/api/v1/tickets/{ticket_id}", token=customer["accessToken"])
    assert own.status_code == 200

    queue = get("/api/v1/tickets", token=customer["accessToken"])
    assert queue.status_code == 403


@pytest.mark.mutates
def test_customer_cannot_view_another_customers_ticket(customer, owner):
    create = post("/api/v1/tickets", token=customer["accessToken"], json={
        "subject": "Private ticket", "description": "x", "priority": "LOW",
    })
    ticket_id = create.json()["data"]["id"]

    r = get(f"/api/v1/tickets/{ticket_id}", token=owner["accessToken"])
    assert r.status_code == 403


def test_ticket_stats_restricted_to_support_staff(support, customer):
    r = get("/api/v1/tickets/stats", token=support["accessToken"])
    assert r.status_code == 200

    r2 = get("/api/v1/tickets/stats", token=customer["accessToken"])
    assert r2.status_code == 403


@pytest.mark.mutates
def test_support_can_start_and_view_impersonation_log(support, customer):
    start = post("/api/v1/support/impersonate", token=support["accessToken"], json={
        "agentName": "QA Automation Agent",
        "targetUserId": customer["userId"],
        "targetUserName": "QA Target Customer",
        "reason": "Automated test of the impersonation audit trail",
    })
    assert start.status_code == 200

    logs = get("/api/v1/support/impersonation-logs", token=support["accessToken"])
    assert logs.status_code == 200
    reasons = [entry["reason"] for entry in logs.json()["data"]["content"]]
    assert "Automated test of the impersonation audit trail" in reasons
