---
title: "SEO guide topic backlog"
status: living document — proposals only, nothing here is a commitment to publish
last_updated: 2026-09-22 (rev. 2)
---

# SEO guide topic backlog

Context: the three live guides (`/guides/qr-ordering-system-restaurants-india`,
`/guides/qr-menu-software-checklist`, `/guides/qr-code-menu-guide`) all target the same
cluster — "QR ordering / QR menu for restaurants." That cluster is covered. Below are gaps:
keywords AviQR can credibly own that nothing on the site targets yet, ranked by how directly
they map to a shipped product feature (so the guide isn't just content-marketing filler —
it can honestly point at something real to try).

## Tier 1 — shipped features, no guide yet (highest priority)

1. ✅ **Hotel QR ordering / contactless room service** — target keyword "QR code room service
   hotel" / "contactless hotel ordering system India". Maps to the hotel dashboard module
   (rooms, guest requests, multi-outlet F&B) already screenshotted in
   `social-content/2026-09-21/`. Drafted: `hotel-qr-ordering-room-service-guide.md`.
2. ✅ **Restaurant loyalty program setup** — target keyword "restaurant loyalty program India"
   / "how to start a loyalty program for restaurant". Maps to the Loyalty & CRM module
   (points, tiers, member history). Drafted: `restaurant-loyalty-program-guide.md`.
3. **Food court / mall multi-vendor management** — target keyword "food court management
   software" / "mall vendor commission tracking". Maps to the mall dashboard module
   (per-vendor GMV, commission, floor status). Narrower audience (mall operators, not
   individual restaurant owners) — worth a guide once the first two prove the pattern.
   Not yet drafted.
4. ✅ **GST billing for restaurants** — target keyword "GST invoice software for restaurants".
   Maps to the shipped POS/billing feature (GSTIN pulled from shop profile onto every
   receipt, itemized discount/service-charge/tax break-up — confirmed in
   `src/pages/company/FeaturesPage.jsx`). Drafted: `gst-billing-software-restaurants-guide.md`
   — deliberately scoped to what billing *software* should do, not tax/filing advice.
5. **Multilingual restaurant menu** — target keyword "menu in regional language app" / "Hindi
   Tamil Telugu menu QR code". Maps to the 9-language menu feature. Overlaps a little with
   the existing checklist guide's language section, so this would need a distinct angle —
   e.g. framed around Tier-2/3 city customers rather than software comparison. Not yet drafted.

## Tier 2 — real search intent, looser product tie-in

6. ✅ **"How to digitize a restaurant menu" (from a PDF/printed menu, not from scratch)** —
   captures owners who already have a menu and don't want to rebuild it. Ties to OCR
   menu-upload, already mentioned in the checklist guide but not its own how-to. Drafted:
   `digitize-printed-menu-ocr-guide.md`.
7. **WhatsApp ordering for small restaurants** — checked the source (`Landing.jsx` feature
   list): AviQR's WhatsApp surface is explicitly "WhatsApp campaigns" (marketing), not order
   intake. Confirmed this is NOT currently a shippable claim — do not draft a "WhatsApp
   ordering" guide. A "WhatsApp marketing for restaurants" guide (SMS/WhatsApp campaigns,
   re-engaging lapsed loyalty members) would be honest and is a reasonable substitute topic —
   added as 7a below.
   7a. **WhatsApp/SMS campaigns for restaurants** — target keyword "restaurant WhatsApp
       marketing". Ties to the campaigns feature and pairs naturally with the loyalty guide
       (re-engaging lapsed members). Not yet drafted.
8. **AI features for restaurants (menu search, fraud detection, demand forecasting)** — ties
   to the AI Hub screenshot already used in social content. Likely better as a shorter
   "what these 11 AI features actually do" explainer than a full SEO guide — search volume
   for the individual features is low, but it's good content to link *from* the other guides.
   Not yet drafted.

## Not recommended right now

- Anything comparing AviQR by name against a specific named competitor's pricing/features —
  same reasoning the checklist draft already states: no verified first-hand pricing data,
  real reputational/legal risk in getting a competitor's claim wrong.
- Any guide that would need to quote a rupee price for Growth/Business — those plans are
  currently shown on the live site as "Launching soon" with no price. Wait until pricing is
  live and confirmed before writing anything that states a number (see the stale-pricing note
  in `social-content/2026-09-21-public-site/captions.md` and in `llms.txt`).

## Suggested order

~~Hotel guide → Loyalty guide → GST billing → digitizing-a-menu how-to~~ (all four drafted
2026-09-22) → food court/mall guide → multilingual-menu (needs a distinct angle first) →
WhatsApp/SMS campaigns guide (7a, replaces the dropped "WhatsApp ordering" idea) → AI features
explainer.
