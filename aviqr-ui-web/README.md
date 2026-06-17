# AviQR Owner — React Dashboard

A complete React + Vite single-page app for the AviQR owner dashboard.
Built with modern React 18, React Router 6, Recharts, and Lucide icons.
**No React Native, no Expo** — this is pure web React.

---

## Project structure

```
aviqr-owner-react/
├── index.html                  ← Vite entry
├── package.json                ← Dependencies & scripts
├── vite.config.js              ← Vite config
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                ← React entry with BrowserRouter
    ├── App.jsx                 ← Routes definition
    ├── styles/index.css        ← Design tokens & global styles
    ├── layouts/
    │   ├── DashboardLayout.jsx ← Sidebar + Topbar + Outlet shell
    │   └── DashboardLayout.css
    ├── components/
    │   ├── Sidebar.jsx / .css  ← Dark left nav with shop card
    │   ├── Topbar.jsx / .css   ← Search, notifications, profile
    │   ├── StatCard.jsx / .css ← KPI tile with trend
    │   ├── OrderRow.jsx / .css ← Live order list row
    │   └── PageStub.jsx / .css ← Placeholder for unbuilt routes
    └── pages/
        ├── Dashboard.jsx / .css ← Main home screen (fully built)
        ├── Orders.jsx
        ├── Menu.jsx
        ├── QRCodes.jsx
        ├── Staff.jsx
        ├── Reports.jsx
        └── Settings.jsx
```

---

## Run it locally

```bash
# 1. Install dependencies (~30 seconds)
npm install

# 2. Start dev server
npm run dev
# Opens at http://localhost:5173

# 3. Build for production
npm run build
# Outputs to dist/ folder

# 4. Preview production build
npm run preview
```

---

## What's built

### ✅ Dashboard home screen (`/dashboard`)
The fully designed and interactive home screen with:
- **Page header** — personalised greeting, "view live menu" and "add menu item" CTAs
- **Live ticker** — animated pulse showing new orders in real time
- **4 KPI cards** — Revenue, Orders, QR Scans, Avg Prep Time with trend indicators
- **Revenue chart** — Recharts area chart with 7d/30d/90d toggle
- **Top selling items list** — Ranked list with trend per item
- **Live orders panel** — 5 active orders with status badges and action buttons
- **Quick actions** — Print QR, Upload OCR menu, Set happy hour pricing
- **Tip card** — Smart suggestion with actionable CTA

### 🏗️ Stub pages (design ready, content placeholder)
- Orders, Menu, QR Codes, Staff, Reports, Settings

### ✅ Shell components
- **Sidebar** — Dark theme, shop card with live status, 7 nav links with active state
- **Topbar** — Search with ⌘K hint, notifications, profile dropdown
- **Responsive** — Sidebar collapses to drawer on mobile (<900px)

---

## Customising

### Change brand colours
Edit `src/styles/index.css` — all colours are CSS variables under `:root`.
The brand palette uses AviQR green (#1D9E75), dark green (#0F6E56), and a neutral gray scale.

### Add a new page
1. Create `src/pages/MyPage.jsx`
2. Add a `<Route>` in `src/App.jsx`
3. Add a nav item in `src/components/Sidebar.jsx`

### Connect to a real API
Replace the mock data arrays at the top of `Dashboard.jsx` with `fetch()` or `axios` calls.
The Spring Boot backend (from the PRD) exposes endpoints like:
- `GET /api/management/outlets/{id}/orders?status=active`
- `GET /api/reports/outlets/{id}/sales?range=7d`

---

## Tech stack

| Layer       | Choice                | Why                              |
|-------------|-----------------------|----------------------------------|
| Framework   | React 18              | Industry standard, huge ecosystem |
| Build tool  | Vite 5                | Fast dev server, instant HMR      |
| Routing     | React Router 6        | Standard for SPAs                 |
| Charts      | Recharts 2            | Declarative, React-native API     |
| Icons       | Lucide React          | Clean, consistent, tree-shakeable |
| Styling     | Plain CSS + variables | No framework lock-in              |

No Tailwind, no Material-UI, no Chakra — just clean CSS with design tokens.
This keeps the bundle small and the styling fully under your control.

---

AviQR Technologies Private Limited · Bengaluru · aviqr.in
