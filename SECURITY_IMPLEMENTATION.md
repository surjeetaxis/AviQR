# Login security and administrator controls

This change adds database-backed login security and support-account lifecycle controls. It supports ISO/IEC 27001 readiness; it does not establish certification or replace a full application/network security assessment.

## Where to use it

- Web: sign in as ADMIN → **Login Security** in the admin sidebar.
- Mobile: sign in as ADMIN → **Login Security** on the admin home screen.
- The API rejects non-admin callers for every security-console action. Support agents cannot create, approve, terminate, or grant security exemptions to accounts.

### Support accounts

1. An administrator enters an agent's name and email. The new account has role SUPPORT and status PENDING. No usable password or login token is returned.
2. An administrator approves it with a reason. Approval changes the status to ACTIVE and requests a password setup/reset code through the existing email notification pipeline.
3. The agent uses Forgot Password to set a password, then signs in with password **and** OTP.
4. An administrator can terminate the account with a reason. TERMINATED accounts cannot log in or refresh; sessions and security grants are revoked. Terminated accounts cannot be reactivated through approval or ordinary status/role endpoints.

Existing support accounts retain their existing statuses during migration. Review the existing ADMIN/SUPPORT roster before rollout. Support accounts are not hard-deleted through the ordinary user-delete endpoint, preserving history.

### Console tabs

- **Login History / Failed Logins:** recorded account, result, method/reason, device metadata, IP and timestamp.
- **Blocked Logins:** historical blocked attempts. Five wrong password/OTP attempts within one hour create a fixed one-hour account lock. Thirty failures per IP within one hour also block login. A verified password reset clears the account lock. Admin and support can review blocked accounts; support can unlock ordinary accounts only. Unblocking requires a reason; IP limits and account status still apply.
- **OTP Exemptions:** an administrator may grant a reasoned exception lasting 1–30 days for an active non-privileged account. The password is still required. ADMIN and SUPPORT cannot receive exemptions.
- **Trusted Devices:** an opaque credential is issued only after successful OTP verification and explicit user consent, expires after 15 days, and is stored as a SHA-256 hash. A supplied device ID is never proof of trust. Revoking a device/exemption also revokes the user's sessions. ADMIN/SUPPORT cannot skip OTP using device trust.
- **Reset Password:** an administrator requests the existing verified-email reset flow and revokes sessions/grants. No administrator receives the user's code or password. Delivery depends on the configured email provider and RabbitMQ pipeline.
- **Support Accounts:** pending, active, suspended/inactive legacy accounts and terminated accounts, with approve/terminate controls.
- **Admin Actions:** durable PostgreSQL history of support creation, approval, termination and security-grant revocation.

## Code controls implemented

- Public registration accepts only OWNER, HOTEL, MALL, SUPPLIER and CUSTOMER. Staff and privileged roles require administrator provisioning.
- Passwords require at least 12 characters and at most 72 UTF-8 bytes to avoid bcrypt truncation. Existing passwords still work for login.
- Ordinary users can sign in with email/password or email/OTP. ADMIN and SUPPORT always require password followed by OTP. The trusted-device checkbox is visible on the initial sign-in form; a device credential is saved only after OTP verification.
- OTP generation uses SecureRandom. Verification checks only the newest live code; five failures consume it. Codes and password challenges are single-use. Attempt counters use an independent transaction, so a failed login cannot roll back the counters.
- Inactive, suspended, pending and terminated accounts cannot log in or refresh. Auth-service checks active account/session state for every protected gateway request. Auth-service outages fail closed.
- Access JWTs expire after 15 minutes, carry tokenType=access and a database session ID. Refresh JWTs cannot authenticate API requests. Refresh-token rotation preserves the session ID; only refresh-token hashes are stored. Impersonation and outlet/vendor/shop-scoped tokens inherit a revocable session.
- Logout, password changes/resets, role/status changes and support termination revoke sessions. Revoking a parent session also invalidates its scoped tokens. Impersonation of privileged targets is rejected.
- The gateway disables discovery-generated routes, strips caller-supplied identity/internal credentials and rejects public internal-API paths.
- Business services require the gateway credential or an authenticated internal-service credential. Internal credentials fail closed when blank. Outbound service clients attach credentials only to configured service-discovery hosts; external AI providers do not receive internal credentials or user identity headers.
- Shop linking verifies actual ownership. Shop-staff mutations verify the caller can manage the target shop.
- Browser access tokens live in memory; refresh and trusted-device credentials use HttpOnly cookies, Secure in production and SameSite=Lax. Staff/customer refresh cookies are separate. Browser authentication checks an allowed Origin and a CSRF header. Native clients use Expo SecureStore; Expo web keeps sensitive values in memory.
- Security responses use Cache-Control: no-store. Existing localStorage bearer credentials are removed when the updated web app loads.

## Database changes

Auth-service Liquibase change **003-login-security**:

- widens the users.status check constraint for PENDING and TERMINATED;
- adds otp_records.failed_attempts with a zero default;
- creates login_security_records and indexes for account/event/time/token lookups.

Migration 004 caps existing trusted-device credentials at 15 days from issuance and adds an IP counter index.

Login events, grants, challenges and admin security actions are persisted in PostgreSQL. Existing general audit events continue to use MongoDB. Raw passwords, OTPs, trusted-device credentials and refresh credentials must not be written into audit records. ADMIN responses omit stored credential hashes.

Apply the change through auth-service's normal Liquibase startup. Take a database backup before rollout. Use a forward migration if a later rollback is needed; reverting the application alone cannot restore the old token format or support status model safely.

## Deployment requirements

1. Set a high-entropy JWT_SECRET (at least 48 bytes) and a separate INTERNAL_SYNC_SECRET (at least 32 characters) consistently on the gateway and services. Example/default strings are rejected. Generate independent values with `openssl rand -hex 48` and `openssl rand -hex 32`; store them in your deployment secret store, not Git.
2. Use SPRING_PROFILES_ACTIVE=production, TLS and the correct browser origins. The built-in production origins are aviqr.com, www.aviqr.com, app.aviqr.com and admin.aviqr.com. Add deployments through `APP_BROWSER_ORIGINS` and corresponding gateway CORS origins. Local profile allows localhost development and non-Secure cookies only locally.
3. Configure the existing RabbitMQ/email notification pipeline before enabling OTP login. Verify real OTP and password-setup delivery in staging. Admin and support cannot use the development fixed-code shortcut.
4. Start all updated backend services and deploy updated web/mobile clients together. Old access tokens lack session claims and old refresh records contain plaintext, so existing users must sign in again. Old mobile clients cannot complete the new password → OTP challenge flow.
5. If no ADMIN exists, temporarily supply BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD to auth-service. Startup provisions the first administrator only when none exists, using a PostgreSQL advisory lock. Remove the bootstrap credentials immediately afterwards. There is no public administrator signup endpoint.
6. Expose only the reverse proxy/gateway publicly. Keep service ports, Eureka, databases, Redis and RabbitMQ private. This implementation authenticates the gateway/service connection with a shared credential; it does not provide mTLS or per-service identities. Restrict network access and plan those stronger service identities according to the threat model.
7. Set TRUSTED_PROXY_IPS to the actual reverse-proxy addresses. Loopback is trusted by default for same-host Nginx. The proxy must overwrite X-Forwarded-For with the real peer, or append the real peer as its rightmost value. Direct callers cannot spoof that header to avoid IP limits. Restrict direct public access to the gateway behind the trusted proxy.
8. Re-enter outlet/vendor/shop context when its 15-minute scoped token expires. The new short lifetime is intentional; the client cannot treat a scoped token as a long-lived session.
9. Review existing privileged accounts, define security-log retention/access rules, and monitor notification failures and abnormal login volume before rollout.

## Validation

Run backend tests with Java 21:

```sh
cd aviqr-backend
./gradlew test
```

The optional real PostgreSQL persistence tests require an **isolated disposable database**, because they create/drop tables:

```sh
./gradlew :auth-service:test -PsecurityTestDbUrl=jdbc:postgresql://127.0.0.1:55486/aviqr_security_test
```

That test database uses username security_test and an empty password on a loopback-only temporary server. Never point it at development, staging or production data.

Run web/mobile unit tests with `npm test` in their respective directories. For the browser fixture regression, build the web app, start a local preview on port 4179, then run `npm run test:security-ui`. It uses installed Chrome by default; PLAYWRIGHT_BROWSER_CHANNEL can choose another installed browser channel, and SECURITY_SMOKE_URL can override the preview URL. API fixtures are intercepted and service workers disabled; it does not modify real accounts.

The browser fixture covers support creation/approval/termination, exemption/revocation, account-unblock controls, password-reset requests, password-to-OTP login and absence of credentials in browser localStorage. Separate Java tests enforce authorization and actual PostgreSQL tests verify persistence, counter rollback protection, credential hashing/revocation and challenge consumption. Email delivery, production network rules and real device behavior still require staging validation.

## ISO/IEC 27001 readiness evidence still required

Track these organizational requirements separately from the code change:

| Area | Evidence to maintain |
| --- | --- |
| Risk management | Scope, asset inventory, risk register, treatment decisions and Statement of Applicability |
| Access management | Approved privileged roster, joiner/mover/leaver procedure, periodic access reviews and exemption approvals |
| Incident response | Named owners, escalation process, rehearsals and incident records |
| Vulnerability management | Dependency scans, remediation deadlines, security reviews and independent penetration-test results |
| Backup/recovery | Protected backups, restoration tests, recovery objectives and results |
| Logging/privacy | Retention policy, access restrictions, monitoring ownership and handling of personal data |
| Suppliers | Hosting, payment, notification and AI provider assessments and agreements |
| Assurance | Internal audits, management reviews and corrective-action evidence |

These controls are an implementation contribution, not a declaration that the entire application or organization is secure or ISO certified.

OTP sending allows five login codes per account per hour and a separate five password-reset codes per hour for recovery. Both count toward a 30-code IP limit per hour. Counters are serialized with PostgreSQL transaction locks and persist even if delivery/login transactions fail. Only trusted proxy forwarding is used for recorded client IP; configure TRUSTED_PROXY_IPS for the deployed proxy.
