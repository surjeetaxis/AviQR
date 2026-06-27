# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02_owner.spec.js >> Owner — login + all pages >> Reports — charts and data visible
- Location: tests/02_owner.spec.js:121:7

# Error details

```
Error: Login failed for sujeet@spiceroute.in: still on /login. Error: 
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e6]:
        - img [ref=e8]
        - generic [ref=e19]:
          - text: Avi
          - emphasis [ref=e20]: qr
        - generic [ref=e21]: SHOP OWNER
      - generic [ref=e22]:
        - generic [ref=e23]: SN
        - generic [ref=e24]:
          - generic [ref=e25]: Sujeet Narayanan
          - generic [ref=e26]: Open · Shop Owner
      - navigation "Primary" [ref=e28]:
        - link "Dashboard" [ref=e29] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e30]
          - generic [ref=e35]: Dashboard
        - link "Orders 3" [ref=e36] [cursor=pointer]:
          - /url: /orders
          - img [ref=e37]
          - generic [ref=e40]: Orders
          - generic [ref=e41]: "3"
        - link "Menu" [ref=e42] [cursor=pointer]:
          - /url: /menu
          - img [ref=e43]
          - generic [ref=e45]: Menu
        - link "QR Codes" [ref=e46] [cursor=pointer]:
          - /url: /qr-codes
          - img [ref=e47]
          - generic [ref=e53]: QR Codes
        - link "Staff" [ref=e54] [cursor=pointer]:
          - /url: /staff
          - img [ref=e55]
          - generic [ref=e60]: Staff
        - link "Reports" [ref=e61] [cursor=pointer]:
          - /url: /reports
          - img [ref=e62]
          - generic [ref=e64]: Reports
        - link "AI Features" [ref=e65] [cursor=pointer]:
          - /url: /ai
          - img [ref=e66]
          - generic [ref=e68]: AI Features
        - link "Settings" [ref=e69] [cursor=pointer]:
          - /url: /settings
          - img [ref=e70]
          - generic [ref=e73]: Settings
      - generic [ref=e74]:
        - button "Sign out" [ref=e75] [cursor=pointer]:
          - img [ref=e76]
          - text: Sign out
        - generic [ref=e79]: v2.0 · aviqr.in
    - generic [ref=e80]:
      - banner [ref=e81]:
        - generic [ref=e82]:
          - img
          - searchbox "Search" [ref=e83]
          - generic: ⌘ K
        - generic [ref=e84]:
          - button "EN" [ref=e86] [cursor=pointer]:
            - img [ref=e87]
            - generic [ref=e90]: EN
          - button "Notifications" [ref=e91] [cursor=pointer]:
            - img [ref=e92]
          - button "SN Sujeet Shop Owner" [ref=e98] [cursor=pointer]:
            - generic [ref=e99]: SN
            - generic [ref=e100]:
              - generic [ref=e101]: Sujeet
              - generic [ref=e102]: Shop Owner
            - img [ref=e103]
      - main [ref=e105]:
        - generic [ref=e106]:
          - generic [ref=e107]:
            - paragraph [ref=e109]:
              - strong [ref=e110]: 54 live orders
              - text: right now. Auto-refreshing every 30s.
            - button "Refresh" [ref=e111] [cursor=pointer]:
              - img [ref=e112]
              - text: Refresh
            - button "View all" [ref=e117] [cursor=pointer]:
              - text: View all
              - img [ref=e118]
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e123]: 💰
              - generic [ref=e124]:
                - generic [ref=e125]: ₹24,680
                - generic [ref=e126]: Today's Revenue
                - generic [ref=e127]: ↑ 73 orders
            - generic [ref=e128]:
              - generic [ref=e130]: 📦
              - generic [ref=e131]:
                - generic [ref=e132]: "73"
                - generic [ref=e133]: Orders Today
                - generic [ref=e134]: ↑ 17 new
            - generic [ref=e135]:
              - generic [ref=e137]: 📊
              - generic [ref=e138]:
                - generic [ref=e139]: ₹338
                - generic [ref=e140]: Avg Order Value
            - generic [ref=e141]:
              - generic [ref=e143]: 👤
              - generic [ref=e144]:
                - generic [ref=e145]: "12"
                - generic [ref=e146]: New Customers
          - generic [ref=e147]:
            - generic [ref=e148]:
              - generic [ref=e149]:
                - generic [ref=e150]:
                  - generic [ref=e151]: Revenue trend
                  - generic [ref=e152]: Last 7 days
                - button "Full report" [ref=e153] [cursor=pointer]:
                  - text: Full report
                  - img [ref=e154]
              - img [ref=e159]:
                - generic [ref=e163]:
                  - generic [ref=e165]: 06-21
                  - generic [ref=e167]: 06-22
                  - generic [ref=e169]: 06-23
                  - generic [ref=e171]: 06-24
                  - generic [ref=e173]: 06-25
                  - generic [ref=e175]: 06-26
                  - generic [ref=e177]: 06-27
                - generic [ref=e179]:
                  - generic [ref=e181]: ₹0k
                  - generic [ref=e183]: ₹10k
                  - generic [ref=e185]: ₹20k
                  - generic [ref=e187]: ₹30k
                  - generic [ref=e189]: ₹40k
            - generic [ref=e196]:
              - generic [ref=e198]:
                - generic [ref=e199]: Top items
                - generic [ref=e200]: By revenue today
              - list [ref=e201]:
                - listitem [ref=e202]:
                  - generic [ref=e203]: "#1"
                  - generic [ref=e204]:
                    - generic [ref=e205]: Paneer Butter Masala
                    - generic [ref=e206]: 168 sold · ₹53,760
                - listitem [ref=e207]:
                  - generic [ref=e208]: "#2"
                  - generic [ref=e209]:
                    - generic [ref=e210]: Butter Chicken
                    - generic [ref=e211]: 152 sold · ₹57,760
                - listitem [ref=e212]:
                  - generic [ref=e213]: "#3"
                  - generic [ref=e214]:
                    - generic [ref=e215]: Butter Naan
                    - generic [ref=e216]: 344 sold · ₹18,920
          - generic [ref=e217]:
            - generic [ref=e218]:
              - generic [ref=e219]:
                - generic [ref=e220]: Live orders
                - generic [ref=e221]: 54 active
              - button "View all" [ref=e222] [cursor=pointer]:
                - text: View all
                - img [ref=e223]
            - generic [ref=e225]:
              - generic [ref=e226]:
                - generic [ref=e227]:
                  - generic [ref=e228]: ORD-1003
                  - generic [ref=e229]: ·
                  - generic [ref=e230]: Deepak Joshi
                  - generic [ref=e231]: T2
                  - generic [ref=e232]: 32m ago
                - generic [ref=e233]:
                  - generic [ref=e234]: Paneer Tikka
                  - generic [ref=e235]: Dal Makhani
                  - generic [ref=e236]: "+1"
                - generic [ref=e237]:
                  - generic [ref=e238]: ₹630
                  - generic [ref=e239]: Preparing
                  - button "Mark ready" [ref=e240] [cursor=pointer]:
                    - text: Mark ready
                    - img [ref=e241]
              - generic [ref=e243]:
                - generic [ref=e244]:
                  - generic [ref=e245]: ORD-1004
                  - generic [ref=e246]: ·
                  - generic [ref=e247]: Sneha Reddy
                  - generic [ref=e248]: T9
                  - generic [ref=e249]: 17m ago
                - generic [ref=e250]:
                  - generic [ref=e251]: Paneer Butter Masala
                  - generic [ref=e252]: Garlic Naan ×2
                - generic [ref=e253]:
                  - generic [ref=e254]: ₹462
                  - generic [ref=e255]: New
                  - button "Accept" [ref=e256] [cursor=pointer]:
                    - text: Accept
                    - img [ref=e257]
              - generic [ref=e259]:
                - generic [ref=e260]:
                  - generic [ref=e261]: ORD-1005
                  - generic [ref=e262]: ·
                  - generic [ref=e263]: Anjali Singh
                  - generic [ref=e264]: T4
                  - generic [ref=e265]: 47m ago
                - generic [ref=e267]: Butter Chicken
                - generic [ref=e268]:
                  - generic [ref=e269]: ₹336
                  - generic [ref=e270]: Ready!
                  - button "Mark done" [ref=e271] [cursor=pointer]:
                    - text: Mark done
                    - img [ref=e272]
              - generic [ref=e274]:
                - generic [ref=e275]:
                  - generic [ref=e276]: ORD-1008
                  - generic [ref=e277]: ·
                  - generic [ref=e278]: Karan Malhotra
                  - generic [ref=e279]: T1
                  - generic [ref=e280]: 37m ago
                - generic [ref=e281]:
                  - generic [ref=e282]: Chicken Kadai
                  - generic [ref=e283]: Dal Makhani
                  - generic [ref=e284]: "+1"
                - generic [ref=e285]:
                  - generic [ref=e286]: ₹882
                  - generic [ref=e287]: Accepted
                  - button "Start cooking" [ref=e288] [cursor=pointer]:
                    - text: Start cooking
                    - img [ref=e289]
              - generic [ref=e291]:
                - generic [ref=e292]:
                  - generic [ref=e293]: ORD-BULK-3
                  - generic [ref=e294]: ·
                  - generic [ref=e295]: Imran Sheikh
                  - generic [ref=e296]: T4
                  - generic [ref=e297]: 75h ago
                - generic [ref=e299]: Butter Naan
                - generic [ref=e300]:
                  - generic [ref=e301]: ₹320
                  - generic [ref=e302]: Ready!
                  - button "Mark done" [ref=e303] [cursor=pointer]:
                    - text: Mark done
                    - img [ref=e304]
              - generic [ref=e306]:
                - generic [ref=e307]:
                  - generic [ref=e308]: ORD-BULK-4
                  - generic [ref=e309]: ·
                  - generic [ref=e310]: Divya Krishnan
                  - generic [ref=e311]: T5
                  - generic [ref=e312]: 100h ago
                - generic [ref=e314]: Chicken Biryani ×2
                - generic [ref=e315]:
                  - generic [ref=e316]: ₹357
                  - generic [ref=e317]: Preparing
                  - button "Mark ready" [ref=e318] [cursor=pointer]:
                    - text: Mark ready
                    - img [ref=e319]
          - generic [ref=e321]:
            - button "📋 Add menu item Add or update dishes Open menu →" [ref=e322] [cursor=pointer]:
              - generic [ref=e324]: 📋
              - generic [ref=e325]:
                - generic [ref=e326]: Add menu item
                - generic [ref=e327]: Add or update dishes
                - generic [ref=e328]:
                  - text: Open menu →
                  - img [ref=e329]
            - button "📱 Generate QR codes Print table QR codes Manage QRs →" [ref=e331] [cursor=pointer]:
              - generic [ref=e333]: 📱
              - generic [ref=e334]:
                - generic [ref=e335]: Generate QR codes
                - generic [ref=e336]: Print table QR codes
                - generic [ref=e337]:
                  - text: Manage QRs →
                  - img [ref=e338]
            - button "👥 Manage staff Add staff, set roles View team →" [ref=e340] [cursor=pointer]:
              - generic [ref=e342]: 👥
              - generic [ref=e343]:
                - generic [ref=e344]: Manage staff
                - generic [ref=e345]: Add staff, set roles
                - generic [ref=e346]:
                  - text: View team →
                  - img [ref=e347]
  - generic [ref=e349]: ₹0k
```

# Test source

```ts
  1   | // AviQR UI Test Helpers
  2   | 
  3   | export const BASE = process.env.UI_URL || 'http://localhost:5173';
  4   | 
  5   | // Seed credentials from aviqr_setup.sql
  6   | export const USERS = {
  7   |   OWNER:    { email: 'sujeet@spiceroute.in',  password: 'Test@1234', role: 'owner',    label: 'Owner' },
  8   |   MANAGER:  { email: 'vikram@gmail.com',       password: 'Test@1234', role: 'manager',  label: 'Manager' },
  9   |   CASHIER:  { email: 'cashier@spiceroute.in',  password: 'Test@1234', role: 'cashier',  label: 'Cashier' },
  10  |   KITCHEN:  { email: 'kitchen@spiceroute.in',  password: 'Test@1234', role: 'kitchen',  label: 'Kitchen' },
  11  |   ADMIN:    { email: 'admin@aviqr.in',         password: 'Test@1234', role: 'admin',    label: 'Admin' },
  12  |   SUPPORT:  { email: 'support@aviqr.in',       password: 'Test@1234', role: 'support',  label: 'Support' },
  13  |   HOTEL:    { email: 'gm@grandpalace.in',      password: 'Test@1234', role: 'hotel',    label: 'Hotel GM' },
  14  |   MALL:     { email: 'admin@forum.in',         password: 'Test@1234', role: 'mall',     label: 'Mall Admin' },
  15  |   SUPPLIER: { email: 'ramesh@teas.in',         password: 'Test@1234', role: 'supplier', label: 'Supplier' },
  16  | };
  17  | 
  18  | export const DEMO_SHOP_ID = '00000000-0000-0000-0000-000000000101';
  19  | 
  20  | /**
  21  |  * Log in via the UI, assert login succeeded (no longer on /login),
  22  |  * and take a screenshot labelled "after-login".
  23  |  */
  24  | export async function loginAs(page, user) {
  25  |   await page.goto('/login');
  26  |   await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 8_000 });
  27  | 
  28  |   await page.fill('input[type="email"], input[name="email"]', user.email);
  29  |   await page.fill('input[type="password"], input[name="password"]', user.password);
  30  |   await page.screenshot({ path: `screenshots/${user.role}-01-login-filled.png` });
  31  | 
  32  |   await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Continue")');
  33  | 
  34  |   // Wait until we leave /login or see an error
  35  |   await Promise.race([
  36  |     page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 12_000 }),
  37  |     page.waitForSelector('.error, [role="alert"], text=/invalid|incorrect|failed/i', { timeout: 12_000 }),
  38  |   ]).catch(() => {});
  39  | 
  40  |   await page.waitForLoadState('networkidle').catch(() => {});
  41  | }
  42  | 
  43  | /**
  44  |  * Navigate to a sidebar item by visible text. Returns true if found.
  45  |  */
  46  | export async function goToTab(page, label) {
  47  |   const sel = `nav button:has-text("${label}"), aside button:has-text("${label}"), a:has-text("${label}")`;
  48  |   const el = page.locator(sel).first();
  49  |   const visible = await el.isVisible({ timeout: 3_000 }).catch(() => false);
  50  |   if (visible) {
  51  |     await el.click();
  52  |     await page.waitForLoadState('networkidle').catch(() => {});
  53  |   }
  54  |   return visible;
  55  | }
  56  | 
  57  | /**
  58  |  * Assert no full-page crash: no "Application error", blank body, or fatal stack trace.
  59  |  */
  60  | export async function assertNoCrash(page, context) {
  61  |   const body = await page.locator('body').innerText().catch(() => '');
  62  |   const lower = body.toLowerCase();
  63  |   // Check for React crash overlay
  64  |   const crashOverlay = page.locator('#webpack-dev-server-client-overlay, [data-testid="error-boundary"]');
  65  |   const hasCrash = await crashOverlay.isVisible({ timeout: 500 }).catch(() => false);
  66  |   if (hasCrash) throw new Error(`${context}: React crash overlay visible`);
  67  |   if (lower.includes('application error') && lower.includes('digest')) {
  68  |     throw new Error(`${context}: Next.js application error on page`);
  69  |   }
  70  | }
  71  | 
  72  | /**
  73  |  * Assert login was successful (not still on /login page, no error alert).
  74  |  */
  75  | export async function assertLoggedIn(page, user) {
  76  |   const url = page.url();
  77  |   if (url.includes('/login')) {
  78  |     const errorText = await page.locator('.error, [role="alert"]').textContent().catch(() => '');
> 79  |     throw new Error(`Login failed for ${user.email}: still on /login. Error: ${errorText}`);
      |           ^ Error: Login failed for sujeet@spiceroute.in: still on /login. Error: 
  80  |   }
  81  | }
  82  | 
  83  | /**
  84  |  * Assert the page is not a blank white screen (has meaningful content).
  85  |  */
  86  | export async function assertHasContent(page, label) {
  87  |   const bodyText = await page.locator('body').innerText().catch(() => '');
  88  |   if (bodyText.trim().length < 20) {
  89  |     throw new Error(`${label}: page appears blank (body text too short)`);
  90  |   }
  91  | }
  92  | 
  93  | /**
  94  |  * Assert no persistent loading spinner (data should have loaded).
  95  |  */
  96  | export async function assertDataLoaded(page, label) {
  97  |   // Wait up to 8s for loading indicators to disappear
  98  |   await page.waitForFunction(() => {
  99  |     const spinners = document.querySelectorAll('[class*="spin"], [class*="loading"], [class*="skeleton"]');
  100 |     return spinners.length === 0;
  101 |   }, { timeout: 8_000 }).catch(() => {
  102 |     // Not fatal — some pages may have background pollers
  103 |   });
  104 | }
  105 | 
```