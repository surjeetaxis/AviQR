# AviQR Mobile — Test Automation

Three layers, increasing fidelity and setup cost.

## Layer 1 — Logic & API-contract tests  (runs anywhere, no native deps)

66 tests. Pure JS: routing map, order-status machine, cart/GST math, auth
session storage, guest-services folio/charge-to-room logic, and API-endpoint
contracts (mocked axios). These run in plain Node — no emulator, no Expo
toolchain.

    npm run test:logic

Files:
  __tests__/unit/roleRouting.test.js        — every role → correct home screen
                                               (catches "admin sees owner dashboard")
  __tests__/unit/orderStatus.test.js        — NEW→ACCEPTED→PREPARING→READY→COMPLETED
  __tests__/unit/cartTotals.test.js         — subtotal, 5%/12% GST, rounding
  __tests__/unit/authFlow.test.js           — token store/clear on login/logout
  __tests__/unit/guestFolio.test.js         — My Bill pending/settled totals,
                                               settle-at-checkout button gating
  __tests__/unit/chargeToRoomGating.test.js — charge-to-room only when OCCUPIED,
                                               server re-validates on booking
  __tests__/unit/guestRequestTypes.test.js  — every guest request type is known
                                               to the staff dashboard's labels
  __tests__/api/authApi.test.js             — auth endpoints + payload shapes
  __tests__/api/orderApi.test.js            — order endpoints
  __tests__/api/guestServiceApi.test.js     — QR hub/requests/bookings/folio +
                                               staff bookings/room-bill endpoints

## Layer 2 — Component tests  (needs jest-expo on the dev machine)

Render React Native components and assert behaviour (Button press, disabled,
loading; StatusBadge; OfflineBadge). Requires the full Expo install:

    npm install                # installs jest-expo + testing-library
    npm test                   # runs jest.config.js (all layers)
    npm run test:components

Files:
  __tests__/components/Button.test.js
  __tests__/components/StatusBadge.test.js
  __tests__/components/OfflineBadge.test.js

## Layer 3 — Detox E2E  (full device/emulator flows)

End-to-end on a real or emulated device: login per role, order management,
navigation. This is a scaffold — wire it to your CI device farm. Add
`testID` props to the screens for the selectors to resolve.

    npm install --save-dev detox
    npm run e2e:build:android
    npm run e2e:test:android

Files:
  .detoxrc.js              — device + build configuration
  e2e/login.e2e.js         — role-based login lands on correct screen
  e2e/orderFlow.e2e.js     — owner accepts & advances an order

## CI recommendation

Run Layer 1 on every push (fast, no device). Run Layers 2–3 nightly or
pre-release on a macOS/Linux runner with an emulator.

    # .github/workflows snippet
    - run: cd aviqr-mobile-expo && npm ci --legacy-peer-deps
    - run: cd aviqr-mobile-expo && npm run test:logic
