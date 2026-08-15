# AviQR Mobile (Expo / React Native)

The mobile app for AviQR — one app, role-based screens for Owner, Admin,
Support, Hotel, Mall, Supplier, and Customer. Every screen is wired to the
backend API (port 8080) with JWT auth and auto-refresh.

---

## Screens (all linked to backend)

    app/login.js              Login (authApi.login)
    app/register.js           Sign up (authApi.register)
    app/index.js              Entry — routes each role to its home

    (owner)/   dashboard, orders, menu, reports, settings, qrcodes,
               staff, profile         → shop owner / cashier / kitchen / manager
    (admin)/   home, users            → platform admin
    (support)/ home                   → support agent
    (hotel)/   home                   → hotel manager
    (mall)/    home                   → mall admin
    (supplier)/home                   → supplier
    (customer)/menu                   → customer QR menu

Each route group has a `_layout.js` (Stack or Tabs) so its screens render.

---

## Run the app

    npm install
    npx expo start          # then press a (Android), i (iOS), or w (web)

### Pointing the app at your backend

Open `src/api/index.js` and set `DEV_URL` for your target:

    Android emulator   → http://10.0.2.2:8080   (default, already set)
    iOS simulator      → http://localhost:8080
    Real device (WiFi) → http://<your-PC-IP>:8080   e.g. http://192.168.1.42:8080
    Web                → '' (same origin)

The backend must be running first:  `cd .. && ./aviqr.sh start`

Login with a seed account (password `Test@1234`):
    Owner → sujeet@spiceroute.in     Admin → admin@aviqr.com

---

## Testing

Three layers — see `__tests__/README.md` for detail.

    npm run test:logic       # 45 tests, no backend/emulator, ~3s  ← run this often
    npm test                 # logic + component tests (needs full install)
    npm run e2e:test:android # Detox on emulator (scaffold)

`test:logic` covers role routing, layout integrity, order-status flow,
cart/GST math, auth token storage, and API endpoint contracts.

---

## Build for stores

    npx eas build -p android    # Play Store AAB
    npx eas build -p ios        # App Store

(Requires an Expo account + `eas-cli`. For production the app uses
`PROD_URL = https://api.aviqr.com`.)
