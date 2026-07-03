// Comprehensive, recorded walkthrough of the Customer flow — public pages,
// direct-QR restaurant menu, mall Food Court QR, supplier Brand QR, and a full
// real order (anonymous browse → login → place → track → history → profile).
// Produces a full video (not retain-on-failure) so the whole session can be
// watched end to end.
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { USERS, DEMO_SHOP_ID } from './helpers.js';

test.use({ video: 'on' });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

const SPICE_ROUTE_SHOP_ID = 'ecdbc557-91fa-44ee-992f-03683ad8bbde';
const FORUM_MALL_ID = 'f35f1a27-5632-43fe-aa8d-1db992097e4e';
const API_URL = process.env.API_URL || 'http://localhost:8080';

function randomPhone() {
  return '9' + Math.floor(100000000 + Math.random() * 899999999).toString().slice(0, 9);
}

// Idempotent upsert of the Supplier demo account's Brand row via direct API
// call, so the Brand QR customer flow (TC3) always has a real, stable brandId
// to hit — independent of whether the Supplier walkthrough spec ran first.
async function ensureSupplierBrand() {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await api.post('/api/v1/auth/login', { data: { email: USERS.SUPPLIER.email, password: USERS.SUPPLIER.password } });
  const { accessToken } = (await login.json()).data;
  const res = await api.post('/api/v1/brands', {
    data: { name: 'Ramesh Teas Group' },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const brand = (await res.json()).data;
  await api.dispose();
  return brand.id;
}

test('Customer — full walkthrough of public pages, menu, food court, brand QR, and a real order', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // ── TC1: Public pages ────────────────────────────────────────────────────
  await page.goto('/');
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.locator('text=AviQR').first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/cust-01-landing.png', fullPage: true });

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await page.fill('input[type="email"]', 'wrong@email.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
  await pause(page, 1500);
  await page.screenshot({ path: 'screenshots/cust-02-login-invalid.png' });

  await page.goto('/register');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/cust-03-register-step1.png', fullPage: true });
  const nextBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button.auth-btn').first();
  if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await nextBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/cust-04-register-step2.png', fullPage: true });
  }

  await page.goto('/forgot-password');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'test@aviqr.in');
  await pause(page);
  await page.screenshot({ path: 'screenshots/cust-05-forgot-password.png' });

  // ── TC2: Restaurant menu (direct shop QR) ───────────────────────────────
  await page.goto(`/menu/${DEMO_SHOP_ID}`);
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/cust-06-menu.png', fullPage: true });
  const vegBtn = page.locator('button:has-text("Veg"), [class*="veg"]').first();
  if (await vegBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await vegBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/cust-07-menu-veg-filter.png', fullPage: true });
    await vegBtn.click(); await pause(page);
  }
  const addBtn = page.locator('button:has-text("Add")').first();
  if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/cust-08-menu-add-to-cart.png', fullPage: true });
  }

  // ── TC3: Food Court (mall QR) + Brand (supplier QR) ─────────────────────
  await page.goto(`/food-court/${FORUM_MALL_ID}`);
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.getByText('Forum Mall Bengaluru')).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/cust-09-food-court.png', fullPage: true });
  await page.click('button:has-text("Spice Route")');
  await page.waitForURL(u => u.pathname.startsWith('/menu/'), { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/cust-10-food-court-menu.png', fullPage: true });

  const brandId = await ensureSupplierBrand();
  await page.goto(`/brand/${brandId}`);
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.getByText('outlet', { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/cust-11-brand-home.png', fullPage: true });

  // ── TC4: Full order flow ─────────────────────────────────────────────────
  // One continuous flow, same page throughout — Playwright isolates localStorage
  // *between* test() blocks, so login must happen and be used within this test.
  const phone = randomPhone();
  await page.goto(`/menu/${SPICE_ROUTE_SHOP_ID}`);
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.locator('.cm-add-btn').first().click();
  await expect(page.locator('.cm-cart-fab')).toBeVisible();
  await page.screenshot({ path: 'screenshots/cust-12-added-to-cart.png', fullPage: true });

  await page.locator('.cm-cart-fab').click();
  await page.click('button:has-text("Proceed to Order")');
  await expect(page.getByText('Log in to continue')).toBeVisible({ timeout: 5_000 });
  await page.fill('input[placeholder="98765 43210"]', phone);
  await page.click('button:has-text("Send OTP")');
  await expect(page.getByText('Enter OTP')).toBeVisible({ timeout: 5_000 });
  await page.fill('input[placeholder="123456"]', '123456'); // dev OTP bypass — works for any phone
  await page.click('button:has-text("Verify & Continue")');
  await expect(page.getByText('Place Order')).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/cust-13-checkout.png', fullPage: true });

  await page.fill('input[placeholder="e.g. Anjali"]', 'Playwright Demo Customer');
  await page.click('button:has-text("Cash at Counter")');
  await page.click('button.cm-proceed-btn:has-text("Place Order")');
  await expect(page.getByText('Order Confirmed!')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: 'screenshots/cust-14-order-confirmed.png', fullPage: true });

  await page.click('.cps-nav-item:has-text("Orders")');
  await page.waitForURL(u => u.pathname === '/portal/orders');
  await expect(page.getByText('My Orders')).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/cust-15-orders-history.png', fullPage: true });

  await page.click('.cps-nav-item:has-text("Profile")');
  await page.waitForURL(u => u.pathname === '/portal/profile');
  await expect(page.getByText(phone)).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/cust-16-profile.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING CUSTOMER WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
