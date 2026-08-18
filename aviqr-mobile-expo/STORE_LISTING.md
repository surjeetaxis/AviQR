# App Store / Play Store listing copy

Reference copy for App Store Connect and Google Play Console, written to the
character limits each store enforces. All facts here match the actual
feature set and pricing in the app (see `aviqr-ui-web/src/pages/landing/Landing.jsx`
and `aviqr-ui-web/public/llms.txt`) — nothing invented for the listing.

This app serves every AviQR role (owner, hotel, mall, supplier, support,
customer), but the store listing is written for its primary discovery
audience: a restaurant/hotel/shop owner searching for a QR menu or POS app.
Customers never need to install anything — they just scan a QR code — so
they're not who this copy needs to convert.

## Apple App Store

**App Name** (≤30 chars) — 30/30
`AviQR: QR Menu & Restaurant OS`

**Subtitle** (≤30 chars) — 29/30
`Restaurant & Hotel Management`

**Promotional text** (≤170 chars, editable anytime without a new build) — 110/170
`Free Starter plan, no credit card. QR menu, live orders, KOT, billing, inventory, staff and loyalty — one app.`

**Keywords** (≤100 chars, comma-separated, no spaces needed around commas) — 89/100
`qr menu,restaurant pos,digital menu,order management,hotel pms,food court,kot,billing,pos`

**Category:** Business (primary), Food & Drink (secondary)

## Google Play

**App name** (≤30 chars) — 30/30
`AviQR: QR Menu & Restaurant OS`

**Short description** (≤80 chars) — 77/80
`QR menu, live orders, KOT, billing & staff management for restaurants, hotels`

**Category:** Business

## Full description (both stores, ≤4000 chars)

```
AviQR is a QR-powered digital menu and restaurant/hotel/mall operating
system built for India. Customers scan a QR code with their own phone
camera — no app to install — to view the menu, order, pay, and track their
order live. You run the whole business — menu, kitchen, staff, inventory,
loyalty, analytics — from this app.

WHAT YOU GET
• Permanent QR code per shop/table — print once, update the menu forever
• OCR menu upload — photograph a printed menu, AI builds the digital menu
  in minutes
• Live order management with Kitchen Display (KOT) — no paper tickets
• GST-ready POS billing and real payments via Razorpay (UPI, card, cash)
• Inventory and recipe cost tracking with low-stock alerts
• Staff roles — owner, manager, kitchen, cashier logins
• Loyalty & CRM with tiers, plus SMS campaigns
• Dynamic pricing by time/date — weekend, festival, happy-hour rules
• Analytics: revenue trends, peak hours, top items, customer spend
• Menu shown to customers in 9 Indian languages automatically
• 11 AI features: recommendations, smart menu search, support chatbot,
  demand forecasting, dynamic pricing, review sentiment, fraud detection,
  voice ordering and more
• Aggregator sync to Zomato and Swiggy
• Hotel mode: rooms, bookings, housekeeping/laundry/spa requests, room
  charge billing
• Mall/food-court mode: one QR for the whole court, per-vendor onboarding
  and revenue-share tracking

PRICING
Starter is free — no credit card required — for up to 20 menu items, 50
orders/day and 1 QR code. Growth is ₹999/month, Business is ₹2,499/month.
No per-order commission on any plan.

Support: support@aviqr.com
```

## Notes for whoever submits this

- Screenshots and the feature graphic/app preview video aren't produced
  here — capture those from a real device/simulator against the actual
  running app.
- Once the app has a live App Store / Play Store listing, add both URLs to
  the `Organization` JSON-LD's `sameAs` array in
  `aviqr-ui-web/src/pages/landing/Landing.jsx` — that's what lets Google
  and AI answer engines connect the website and the app as the same thing.
  Left out for now rather than filled with placeholder URLs, since a wrong
  store link is worse than no link.
