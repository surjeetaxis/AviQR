# payment-gateway-service

Online payments through each hotel's own merchant account. Replaces the legacy AxisRooms
`payment-service` (Spring Boot 1.5), whose gateways are ported here as providers behind one
interface (`gateway/GatewayProvider`).

## Flow

1. pms-service creates a payment: `POST /api/v1/payment-gateway/internal/transactions`
   (X-Internal-Secret) with hotel, amount, currency and the `returnUrl` to send the guest back to.
2. The guest opens `payUrl` (`/public/pay/{id}`), which hands them to the gateway: a redirect,
   an auto-submitted form, or the gateway's own checkout script.
3. The gateway returns to `/public/callback/{id}` (or `/public/return/{gateway}`, or notifies
   `/public/notify/{gateway}`). The provider verifies the result, the amount is checked, and the
   guest goes to `returnUrl?payment={id}&status=PAID|FAILED|PENDING|UNVERIFIED`.
4. pms-service reads the result server-side with `GET /internal/transactions/{id}`. Never trust
   the `status` query parameter on the return URL.

A finished payment (PAID or FAILED) never changes again. A result whose amount differs from the
request is recorded UNVERIFIED.

## Gateways and how results are trusted

| Gateway | Result is trusted because |
| --- | --- |
| Razorpay, AirPay, AggrePay, MIGS (GLOBAL), Global Payments UK, BML, HNB Sentry, WebXPay | hash / signature with the hotel's secret (AirPay's is a CRC32, as AirPay defines it) |
| Yes Bank (ISGPay), Bank of Baroda, SafexPay | response encrypted with the hotel's key |
| AsiaPay | signed server datafeed to `/public/notify/asiapay` (set it in the merchant profile) |
| PayPal, Paytm, Commercial Bank (MPGS), Sampath (Paycorp), PayTabs, GoPES | fetched from the gateway's API server-to-server |
| MobiVersa, AccomClick | nothing: their results are unsigned, so success is UNVERIFIED and staff confirm it (`PUT /transactions/{id}/resolve`) |
| AgodaPay | not available: it needs card numbers typed on AviQR's own page (PCI DSS) |

The legacy `PHM` gateway had no implementation and isn't ported. Where the legacy service
skipped verification (MIGS, Sentry, WebXPay, AggrePay, MobiVersa, ComBank's in-memory session
map), this service checks the gateway's signature or marks the result UNVERIFIED instead.

Credentials are per hotel, AES-256-GCM encrypted (`PAYMENT_GATEWAY_CREDENTIAL_KEY`) and
write-only through the API. None of the legacy service's hard-coded merchant credentials were
carried over; they are still in that repository's history and should be rotated.

## One-time server setup

```bash
sudo -u postgres createdb -O aviqr aviqr_payment_gateway
# roles: security/database-roles.sql with app_role=aviqr_payment_gateway_runtime_v1
openssl rand -base64 32   # → PAYMENT_GATEWAY_CREDENTIAL_KEY in the service's environment
```

Environment: `PAYMENT_GATEWAY_CREDENTIAL_KEY`, `PAYMENT_GATEWAY_PUBLIC_URL` (default
`https://api.aviqr.com`), `INTERNAL_SYNC_SECRET`, `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`, and
optionally `PAYPAL_PARTNER_ATTRIBUTION_ID`. Create the `aviqr-payment-gateway-service` systemd
unit like the others (DEPLOYMENT_NO_DOCKER.md, PROD STEP 8).

Vendor jars in `libs/` (Paytm checksum, ISGPay, PayGate AES, FSS iPayPipe, PayDollar, Paycorp)
come from the legacy service; `ProviderSignatureTest` checks they run on Java 21.
