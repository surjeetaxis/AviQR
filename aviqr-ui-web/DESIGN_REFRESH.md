# AviQR shared hospitality design

Branch: `design/aviqr-ui-refresh`.

The web and Expo applications share a forest green and mint palette, warm neutral backgrounds, white bordered cards, restrained shadows, clear page headings, and green primary actions. Status, payment, and role accents retain their semantic colors.

## Coverage

- Public, authentication, onboarding, company, legal, guide, and QR generator pages.
- Restaurant operations: dashboard, orders, menu, kitchen, billing, QR codes, staff, inventory, raw materials, campaigns, loyalty, reporting, analytics, settings, and AI tools.
- Admin, support, supplier, mall, hotel, and PMS pages and panels.
- Customer menu, ordering, profile, addresses, order tracking, booking, check-in, reviews, and account security.
- Expo outlet and supplier wrappers inherit the refreshed shared restaurant screens.

## Where to maintain the design

- Web: `src/styles/hospitality.css` supplies the shared tokens and surface/control styles. It loads after existing styles in `src/main.jsx`. Page-specific layout stays in the existing page styles. Inline role grids use `workspace-grid` to collapse safely on phones.
- Expo: `src/theme/index.js` supplies colors, radii, spacing, typography, and shadows. Shared controls live in `src/components/common`. Screen styles now use theme tokens in place of repeated brand and neutral literals.
- Keep QR artwork and status colors independent of the UI palette. Use `Colors.brandSurface` and `Colors.onBrand` for dark mobile headers, and `Colors.primary` for primary actions.

## Verification

The production web build, 54 web tests, 15 Expo component tests, and the existing browser login/security regression pass. Expo exports compile the application for Android, iOS, and web.

Browser page checks cover desktop and phone-width web routes and role panels, plus Expo screens at phone width. They use controlled authentication and API responses to review layouts, empty/error states, navigation, and runtime errors. These checks do not certify every live-backend interaction. Native builds were compiled; physical-device and emulator visual testing was not performed.

Existing account-security work in the shared checkout is preserved. No deployment is included.

## Full-screen follow-up

Signup now shares the hospitality design across all four public business roles, with associated labels, progress, mobile branding, consent controls and working legal links. Managed roles retain their existing provisioning rules. Shared web metrics now use line icons and consistent label/value hierarchy. Public navigation includes a mobile menu and real footer links. Workspace headers derive avatar initials and expose dropdown state; the owner workspace includes help/legal footer links. Admin security tables use theme tokens with a scoped stylesheet. Expo audit metadata wraps and displays full actor identifiers. Expo reports use the shared header/cards, horizontally scrollable series, explicit empty states and accessible export controls.

Validation: web production build; 54 web tests; Android/iOS/web Expo export; 276 web page/viewport checks; 115 Expo screen checks (15 delegated wrappers reuse shared screens); 12 signup role/viewport consent flows; populated reports at 320/390/1440px. Browser checks use fixture APIs and are not live-backend or native-device acceptance tests.
