# Security scan remediation — 2026-10-02

The Security run for commit `30e097716861c2237acd2fe5de1bede074faee2b`
failed Dependencies and both CodeQL jobs. Secrets and Infrastructure passed.
Run: https://github.com/surjeetaxis/AviQR/actions/runs/37031771029

## Changes

- Require Axios >=1.20.0 in both clients. Override mobile PostCSS to >=8.5.28
  and image-size to >=2.0.4. Confirmed Metro's Buffer-based image-size API
  still reads a PNG fixture correctly.
- Rasterize selected menu files onto a canvas for preview. SVG, PDF and HTML
  are not embedded into a browser document; original uploads remain available
  to the OCR service. Release ImageBitmap resources when rendering completes.
- Bound prerender file paths to dist and bind its temporary server to loopback.
- Keep all Expo browser storage values in memory and use Expo Crypto UUIDs
  for analytics IDs. Native credential storage remains Keychain/Keystore.
- Disable Android application backups in the manifest and Expo configuration.
- Bound report date windows and pagination before arithmetic and query execution.
- Encode canonical menu path segments and escape their HTML attribute values.
- Keep Spring CSRF protection enabled. Business services exempt only requests
  marked by the earlier service trust filter after its credential/signature checks.
  The marker is a server-side request attribute, never a client header.
  Browser cookie/origin checks remain enforced at the gateway. Eureka ignores
  CSRF only on its private /eureka/** API; its dashboard keeps CSRF enabled.

## Remaining security finding

Expo CLI and @expo/code-signing-certificates depend on node-forge 1.4.0.
CVE-2026-85393 affects that latest published release; npm currently provides no
patched version. Even Expo CLI 57.0.27 still depends on node-forge.
https://github.com/advisories/GHSA-86w9-cpqp-85rv

At the user's explicit request, Security scans are now advisory for deployment.
They continue to fail and report findings, but only successful exact-commit CI
and all required CI jobs gate deployment. This permits deployment with known
security findings and does not resolve this dependency vulnerability.
The deployment verification step warns about failed or unfinished scans.
Remediation still requires a vetted fixed dependency or compatible replacement.
Do not use a version-label change as evidence that the cryptography is patched.

## Validation

Backend regression tests (including PostgreSQL persistence/migration tests),
54 web tests and the production web build passed. Mobile tests passed:
73 logic/API tests and 15 component tests. Added malicious HTML/path and
pagination-abuse regressions, and trust-filter marker assertions.
CodeQL must run again on the new commit to confirm resolution of its findings.
