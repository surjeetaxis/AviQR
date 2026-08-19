# AviQR — Play Console Submission Checklist

Prepared from a direct audit of the codebase and a live check against production (`api.aviqr.com`), not assumed. Sections marked **✅ Ready** can be pasted straight into Play Console. Sections marked **⚠️ Needs you** need a decision or an action only you can take — I either don't have the access, or the honest answer depends on something only you know.

I won't log into Play Console myself (no Google account credentials handling on my end) — this doc is built so you can paste through the wizard yourself.

---

## 1. Store listing — ✅ Ready

**App name** (30 char max)
```
AviQR
```

**Short description** (80 char max, 79 used)
```
QR ordering, digital menus & billing for restaurants, hotels & malls in India
```

**Full description** (4000 char max) — grounded in features actually shipped in this codebase, nothing invented:
```
AviQR is a QR-powered platform for restaurants, cafes, hotels, and malls across India — one app to run digital menus, live orders, and billing.

WHAT YOUR CUSTOMERS GET
• No app to install — scan a QR code, order from any phone's browser
• Menus auto-translate into 9 Indian languages
• Live order tracking from Confirmed through Ready
• Optional video and 3D previews on menu items
• Loyalty points on every order

WHAT YOU GET AS THE BUSINESS
• One permanent QR code — update prices and items anytime, no reprinting
• Photograph your existing printed menu and let OCR build your digital menu in minutes
• Dynamic pricing by time and day (happy hour, weekend, festival pricing)
• Kitchen Display (KOT) — orders reach the kitchen screen instantly
• POS billing, GST-ready invoices, and real Razorpay-powered payments alongside cash
• Staff roles for owner, manager, kitchen, and cashier
• Inventory and recipe-level ingredient cost tracking
• A free Starter plan — no credit card required to get started

FOR HOTELS
Room service, housekeeping, laundry, and spa requests from one in-room QR code, plus a full front-desk dashboard for bookings and room-charge billing.

FOR MALLS & FOOD COURTS
Onboard every vendor and browse the whole food court from a single scan, with revenue-share tracking per stall.

Get started free at aviqr.com or directly in the app.
```

**Category**: Business (recommended — primary purpose is restaurant/hotel/mall operations, not consumer food discovery)

**Contact**: support@aviqr.com · https://aviqr.com

---

## 2. App icon and screenshots — ⚠️ Needs you (icon done, screenshots not)

- **App icon (512×512)**: generated and ready at `store-assets/play-store-icon-512.png` in this repo. Resized from your existing `assets/icon.png`, no alpha channel (correct — Play composites its own background, so a flat icon is right).
- **Screenshots (min 2, phone)**: **not generated.** These need real captures of the running app (e.g. customer QR menu, owner dashboard, KOT screen). I can do this next by running the app in the Android emulator already installed on this machine and capturing real screens — say the word and I'll do it as a follow-up.
- **Feature graphic (1024×500)**: **not generated** — a marketing banner, separate ask from the app icon. I can design one if you want it.

---

## 3. Privacy Policy — ✅ Ready

```
https://aviqr.com/privacy
```
Already live — confirmed reachable (HTTP 200) as of this session.

---

## 4. Data Safety — ✅ Ready (answers below), verified against actual permissions/dependencies, not guessed

**Does your app collect or share any of the required user data types?** Yes

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Name | Yes | No | Account functionality |
| Email address | Yes | Yes — MSG91 (OTP/email delivery), Elastic Email (transactional email) | Account functionality, communications |
| Phone number | Yes | Yes — MSG91 (SMS/OTP delivery) | Account functionality, communications |
| Approximate & precise location | Yes (optional, contextual — "nearby shops" feature) | No | App functionality |
| Photos | Yes (menu photo upload / OCR, profile images) | No | App functionality |
| App activity (order history) | Yes | No | App functionality |
| Financial info (order amounts) | Yes | Yes — Razorpay (payment processor) | Payment processing |
| Device/other IDs (push notification token) | Yes | No | App functionality (order/status notifications) |

**Is all user data encrypted in transit?** Yes — verified: release builds have cleartext HTTP traffic disabled (`usesCleartextTraffic` only enabled for debug builds), all API calls go over HTTPS to `api.aviqr.com`.

**Do you provide a way for users to request their data be deleted?** Yes — verified in code: `app/(owner)/profile.js` has an account-deletion action wired to `authApi.deactivateAccount`.

**No ad SDK, no analytics/crash-reporting SDK** are present in `package.json` — confirmed by dependency scan. Don't declare data collection for advertising or analytics purposes; there's genuinely none.

---

## 5. Content Rating — ✅ Ready (how to answer the IARC questionnaire)

- Violence, sexual content, profanity, gambling, controlled substances: **No** to all
- User-generated content: **Yes** — the app has a shop review/rating feature (text reviews, star ratings). It's not moderated user-to-user chat, just per-shop reviews — answer accordingly if the questionnaire distinguishes.
- Shares user location: **Yes** (already covered in Data Safety)
- Digital purchases: **Yes** (order payments via Razorpay)

Expected outcome: **Everyone** / **PEGI 3**-equivalent — nothing in the app warrants a higher rating.

---

## 6. Target audience — ✅ Ready

- **Age groups**: select **18 and older** as the primary target — this is a business/operations tool (restaurant, hotel, mall management), not directed at children.
- **Designed for children / families?** **No.**
- The customer-facing QR ordering flow is usable by anyone scanning a table QR, but the app itself isn't marketed or designed toward children — answer the "primarily child-directed" question **No**.

---

## 7. Ads declaration — ✅ Ready

```
Does your app contain ads? No
```
Verified — no AdMob, Facebook Audience Network, AppLovin, Unity Ads, or any other ad SDK in `package.json`.

---

## 8. App Access / login credentials — ⚠️ Needs you (found a real problem here)

The app has **two different access paths** for Play reviewers, and neither is ready to hand over as-is:

**Path A — Guest customer ordering (no login needed)**
The QR-menu flow at `/menu/{shopId}` doesn't require login. I checked the demo shop ID hardcoded as the app's fallback (`00000000-0000-0000-0000-000000000101`) directly against production — **it returns HTTP 200 but with an empty menu (`"shop": null`)**. It is *not* seeded on production, so it would show reviewers a blank screen. You'd need to either:
  - Point reviewers to a **real shop's live menu URL** that has actual menu items (if one of your onboarded restaurants has a populated menu), or
  - Seed a proper demo shop on production for this purpose.

**Path B — Owner/staff dashboard (login required)**
I don't have production login credentials to hand over, and I won't create an account myself (that requires setting a password, which I don't do on your behalf). The seed accounts in this repo's README (`sujeet@spiceroute.in`, `admin@aviqr.com`) are documented as **local dev seed data** — I can't confirm whether those same accounts exist on the production database without either you checking or me querying it with credentials I don't have.

**What I'd suggest**: create one dedicated reviewer account on production (a throwaway owner login with a populated demo shop) specifically for this Play Console field, rather than reusing real customer or dev credentials.

---

*Generated by auditing the actual codebase and live production API — not filled from assumptions. Where something couldn't be verified, it's flagged above rather than guessed.*
