# AviQR Security Incident Response

This runbook covers suspected account takeover, exposed credentials, payment abuse, and service compromise. The incident lead records the timeline, decisions, evidence locations, and owners in a restricted incident record. Do not put passwords, OTPs, access/refresh tokens, private keys, or full payment credentials in incident notes.

## Alert delivery

The auth service records security events and publishes account notices through its durable outbox. The notification service emails the affected user. High-impact events are also sent to the responder mailbox configured with `APP_SECURITY_ALERT_RECIPIENTS` as a comma-separated list. Configure this value in the production secret/configuration store, verify delivery to every responder address, and keep at least two on-call recipients. An empty value leaves user notices enabled but disables responder email alerts; the notification service logs this condition.

Responder email alerts are generated for account locks, passkey enrollment/removal, OTP exemptions, support approval/termination, and password reset events. Monitor the RabbitMQ dead-letter queue `security.notice.failed.queue` and notification delivery failures as well as the responder inbox. Alert rules should page the on-call responder for a dead-lettered security notice or a persistent failure to deliver a responder alert.

## First response

1. Acknowledge the alert and open an incident record. Note UTC time, alert/event ID, affected account or service, source IP if available, and the first observer.
2. Confirm the event using the append-only auth security history, admin audit log, gateway/auth/payment service logs, and payment-provider dashboard. Preserve relevant records before changing state.
3. For suspected account compromise, disable or terminate the account, revoke all sessions and security grants, remove suspicious trusted devices/passkeys, and initiate a verified password reset. Do not unlock the account until the owner is verified.
4. For a leaked credential or key, revoke/rotate it at the issuer, update the production secret store, restart affected services safely, and check access logs for use since the earliest plausible exposure.
5. For payment abuse, pause the affected payment integration or merchant key when needed, compare internal payment state with provider records, and preserve webhook/request IDs. Never mark a payment successful based only on client-provided status.
6. Scope the incident across accounts, tenants, services, and time. Search for related logins, IPs, device IDs, admin actions, failed authorization, unusual exports, and payment state changes.
7. Contain only the affected paths where practical. If broad service isolation is needed, record customer impact and use the documented rollback/recovery path.
8. Notify affected customers and required internal/legal contacts according to the incident severity and applicable obligations. Keep communications factual and coordinated through the incident lead.

## Recovery and follow-up

- Restore service from a known-good release/configuration, rotate affected secrets, and verify login, session revocation, tenant access, and payment callbacks.
- Keep monitoring elevated until the incident lead closes the incident.
- Within five business days, record root cause, impact, timeline, evidence, containment/recovery actions, and corrective owners/dates. Add regression tests and update the ASVS checklist and threat model.
- Run a tabletop exercise at least annually and after a major auth/payment architecture change. Record participants, response times, missed alerts, and assigned fixes.

## Severity guide

| Severity | Examples | Response |
|---|---|---|
| Critical | Confirmed production compromise, active exfiltration, signing/DB/payment secret compromise, cross-tenant access | Page incident lead and engineering immediately; contain and preserve evidence. |
| High | Admin/support account compromise, unauthorized passkey change, repeated targeted takeover, material payment manipulation | Notify on-call responders immediately; revoke sessions/grants and investigate scope. |
| Moderate | Account lock bursts, isolated suspicious login, blocked abuse without evidence of access | Review promptly during the on-call period; document disposition and watch for recurrence. |

Keep responder contacts, provider escalation paths, production access procedures, and backup/restore instructions in the restricted operations system, not this public repository.
