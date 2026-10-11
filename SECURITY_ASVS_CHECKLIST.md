# AviQR Security Verification Checklist

**Baseline:** OWASP Application Security Verification Standard (ASVS) 5.0.0  
**Initial target:** Level 2 for the public SaaS application and APIs  
**Status:** Working checklist; every item needs evidence from code, configuration, and a test or operational record before it can be marked verified.

Use `Open`, `In progress`, `Verified`, or `Not applicable` in the Status column. Record the verifier, date, evidence link, and any accepted risk in the Evidence column. Review this checklist for every release that changes authentication, authorization, payments, tenant data, or deployment configuration.

| ASVS area | AviQR verification | Current evidence / follow-up | Status |
|---|---|---|---|
| V1 Encoding and sanitization | Validate inputs at API boundaries; encode output for HTML/JSON; parameterize database queries; safely process uploaded files and generated documents. | Add negative tests for stored/reflected XSS, injection, SSRF, path traversal, and unsafe file types. | Open |
| V2 Authentication | Require password plus OTP for ADMIN/SUPPORT; enforce OTP retry/send limits; verify reset flows do not disclose account existence; verify passkey enrollment and assertion signatures, origin, RP ID, user verification, expiry, and one-time use. | Code contains password+OTP, lockout controls, and privileged passkey support for sensitive-action step-up. Verify live RP ID/origins and add end-to-end passkey ceremony tests. | In progress |
| V3 Session management | Verify short-lived access tokens, refresh-token rotation/reuse detection, logout, session revocation, cookie flags, CSRF protections, and revocation after reset/termination. | Exercise web and mobile flows; confirm old refresh tokens fail after rotation and all sessions fail after reset/termination. | Open |
| V4 Access control | Test role checks server-side, tenant isolation for every object read/write, admin/support separation, and denial by default. | Add cross-tenant and horizontal/vertical privilege tests for payment, shop, hotel, support, and admin endpoints. | Open |
| V5 Validation, sanitization, encoding | Verify schema constraints, size limits, canonicalization, safe error messages, and context-aware escaping. | Add fuzz/property tests for important public APIs and file/import endpoints. | Open |
| V6 Stored cryptography | Verify modern password hashing, authenticated encryption for recoverable secrets, key separation, rotation, and no secrets in source or logs. | Inventory deployed keys and DB credential encryption; test backup/restore with keys kept outside database backups. | In progress |
| V7 Error handling and logging | Log authentication, authorization, session, payment, and admin security events without credentials, OTPs, tokens, or payment secrets. Protect audit records and alert responders on high-risk events. | Account notices and append-only security history exist; verify operational alert delivery, alert recipient configuration, retention, and incident escalation. | In progress |
| V8 Data protection | Classify personal/payment data; minimize retention; enforce TLS; protect backups and exports; restrict sensitive data in analytics and logs. | Document retention periods and prove backup encryption/access controls. | Open |
| V9 Communications | Enforce HTTPS, safe proxy/header handling, HSTS, secure TLS configuration, and strict CORS allowlists. | Verify production responses and proxy trust settings with external TLS/header scans. | In progress |
| V10 Malicious code | Review dependencies, build scripts, generated artifacts, and release provenance; run secret and dependency scans. | Make CI findings actionable and record accepted exceptions with owners and expiry dates. | Open |
| V11 Business logic | Test payment state transitions, idempotency, refunds, booking/order ownership, and abuse limits. | Expand race-condition and replay tests around payment webhooks and high-value mutations. | Open |
| V12 Files and resources | Verify upload limits, storage isolation, malware/content checks where appropriate, and safe download headers. | Inventory upload and export endpoints; test oversized and malformed input. | Open |
| V13 API and web services | Verify authentication on every route, rate limits, request-size limits, schema validation, safe CORS, and no direct service exposure. | Validate every gateway route against service-level controls; verify direct service ports are private. | Open |
| V14 Configuration | Fail startup on missing/weak production secrets; separate environments; harden hosts/containers; restrict database and service accounts. | Recheck production configuration and database roles after each infrastructure change. | Open |
| V15 Secure coding and architecture | Maintain threat models for authentication, multi-tenancy, payments, and service-to-service trust; review security-sensitive changes. | Record threat-model owners and update them when trust boundaries change. | Open |
| V16 Security testing | Run unit/integration tests, SAST, dependency/SCA, secret scans, DAST/API tests, and an independent penetration test before major releases. | Track coverage and fix/accept findings with severity, owner, and due date. | Open |
| V17 Resilience and privacy | Verify abuse monitoring, backup recovery, incident response, data-subject workflows, and privacy-safe telemetry. | Run an incident tabletop and a restore exercise; document outcomes and owners. | Open |

## Release evidence required

- CI run for the exact candidate commit, including backend/web/mobile tests and security scans.
- API authorization and tenant-isolation test results.
- Dependency, secret, and static-analysis findings with unresolved high/critical items assigned or explicitly accepted.
- Production configuration check for secrets, TLS, CORS, exposed ports, and alert recipients.
- Release operator, rollback point, and post-deployment smoke-test results.

This checklist is an implementation aid, not a certification statement. Use the versioned [OWASP ASVS 5.0.0 requirements](https://github.com/OWASP/ASVS/tree/v5.0.0) as the normative source and keep requirement identifiers version-prefixed in any detailed evidence record.
