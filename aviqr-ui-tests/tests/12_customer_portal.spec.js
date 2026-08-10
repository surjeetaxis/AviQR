// End-to-end coverage for the unified Customer Portal shell: browsing stays
// anonymous, checkout requires phone+OTP login (dev bypass code 123456 works
// for any phone in local/dev), a real order is placed and tracked, it shows up
// in the Orders tab, and the shell wraps all three QR-flow pages without
// breaking their existing URLs.
import { test, expect } from '@playwright/test';

const SPICE_ROUTE_SHOP_ID = 'ecdbc557-91fa-44ee-992f-03683ad8bbde';
const FORUM_MALL_ID = 'f35f1a27-5632-43fe-aa8d-1db992097e4e';

function randomPhone() {
  return '9' + Math.floor(100000000 + Math.random() * 899999999).toString().slice(0, 9);
}

test.describe('Customer Portal — bottom nav shell present on all 3 QR flows', () => {
  test('Restaurant menu (/menu/:shopId) keeps its URL and gets the shell nav', async ({ page }) => {
    await page.goto(`/menu/${SPICE_ROUTE_SHOP_ID}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bn-wrap')).toBeVisible();
    await expect(page.locator('.cm-shop-name')).toBeVisible();
    await page.screenshot({ path: 'screenshots/portal-1-menu-with-shell.png', fullPage: true });
  });

  test('Food court (/food-court/:mallId) keeps its URL and gets the shell nav', async ({ page }) => {
    await page.goto(`/food-court/${FORUM_MALL_ID}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.bn-wrap')).toBeVisible();
    await expect(page.getByText('Forum Mall Bengaluru')).toBeVisible();
    await page.screenshot({ path: 'screenshots/portal-2-foodcourt-with-shell.png', fullPage: true });
  });

  test('Portal Home with no scanned context shows the "scan a QR" empty state', async ({ page }) => {
    await page.goto('/portal/home');
    await expect(page.locator('.bn-wrap')).toBeVisible();
    await expect(page.getByText('Scan a QR to get started')).toBeVisible();
  });
});

// One continuous flow, same page/context throughout (Playwright isolates
// localStorage *between* test() blocks, so login must happen and be used
// within a single test to prove persistence actually works).
test('Full order flow: browse anonymously → login prompted at checkout → real order placed → tracked → appears in Orders history', async ({ page }) => {
  const phone = randomPhone();

  // 1. Browse and add to cart without logging in.
  await page.goto(`/menu/${SPICE_ROUTE_SHOP_ID}`);
  await page.waitForLoadState('networkidle');
  await page.locator('.cm-add-btn').first().click();
  await expect(page.locator('.cm-cart-fab')).toBeVisible();
  await page.screenshot({ path: 'screenshots/portal-3-added-to-cart-anonymous.png', fullPage: true });

  // 2. Checkout requires login — phone+OTP self-registers a new CUSTOMER account.
  await page.locator('.cm-cart-fab').click();
  await page.click('button:has-text("Proceed to Order")');
  await expect(page.getByText('Log in to continue')).toBeVisible({ timeout: 5_000 });
  await page.fill('input[placeholder="98765 43210"]', phone);
  await page.click('button:has-text("Send OTP")');
  await expect(page.getByText('Enter OTP')).toBeVisible({ timeout: 5_000 });
  await page.fill('input[placeholder="123456"]', '123456'); // dev OTP bypass — works for any phone
  await page.click('button:has-text("Verify & Continue")');
  await expect(page.getByText('Place Order')).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/portal-4-checkout-after-login.png', fullPage: true });

  // 3. Place a real CASH order — no more setOrderPlaced(true) mock.
  await page.fill('input[placeholder="e.g. Anjali"]', 'Playwright Test Customer');
  await page.click('button:has-text("Cash at Counter")');
  await page.click('button.cm-proceed-btn:has-text("Place Order")');

  await expect(page.getByText('Order Confirmed!')).toBeVisible({ timeout: 10_000 });
  const chipText = await page.locator('.cm-order-id-chip').innerText();
  expect(chipText).not.toContain('ORD-2848'); // the old hardcoded fake order id
  await expect(page.locator('.cm-status-current strong')).toHaveText('Confirmed');
  await page.screenshot({ path: 'screenshots/portal-5-real-order-confirmed.png', fullPage: true });

  // 4. Same logged-in session, same tab — the real order now appears in Orders history.
  await page.click('.bn-item[aria-label="Orders"]');
  await page.waitForURL(url => url.pathname === '/portal/orders');
  await expect(page.getByText('My Orders')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText('Playwright Test Customer').or(page.locator('text=/#.+/')).first()).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/portal-6-orders-tab-with-real-order.png', fullPage: true });

  // 5. Profile tab shows the real logged-in phone.
  await page.click('.bn-item[aria-label="Profile"]');
  await page.waitForURL(url => url.pathname === '/portal/profile');
  await expect(page.getByText(phone)).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/portal-7-profile-tab.png', fullPage: true });
});