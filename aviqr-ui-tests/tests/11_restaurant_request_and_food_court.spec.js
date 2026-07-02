// End-to-end coverage for the two newly-built flows:
//   1. Restaurant Request Flow — mall admin invites a restaurant by shop id,
//      the restaurant owner accepts it from their dashboard, mall sees it go Active.
//   2. Food Court QR Flow — an unauthenticated customer visits the food-court
//      route, sees the restaurant list, and can click through to a real menu.
import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, USERS } from './helpers.js';

// Cake Studio, owned by priya@cake.in — untouched by other tests in this suite,
// so it's a clean shop id to invite/accept/reject against.
const CAKE_STUDIO_SHOP_ID = '67685266-6b45-4e40-851c-8277ef650ca3';
const CAKE_STUDIO_OWNER = { email: 'priya@cake.in', password: 'Axis321#', role: 'owner3' };
const FORUM_MALL_ID = 'f35f1a27-5632-43fe-aa8d-1db992097e4e';
const API_URL = process.env.API_URL || 'http://localhost:8080';

// Other suite runs (and this suite re-running) may leave Cake Studio already
// linked to Forum Mall — delete any pre-existing vendor row so the invite test
// below always starts from a clean, unlinked shop, same fix applied on the
// pytest side for the same shared-DB collision.
async function clearExistingLink() {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const login = await api.post('/api/v1/auth/login', { data: { email: USERS.MALL.email, password: USERS.MALL.password } });
  const { accessToken } = (await login.json()).data;
  const vendors = await api.get(`/api/v1/vendors/mall/${FORUM_MALL_ID}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  for (const v of (await vendors.json()).data) {
    if (v.shopId === CAKE_STUDIO_SHOP_ID) {
      await api.delete(`/api/v1/vendors/${v.id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    }
  }
  await api.dispose();
}

test.describe.serial('Restaurant Request Flow', () => {
  test.beforeAll(clearExistingLink);

  test('Mall admin invites a restaurant by shop id', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.click('button:has-text("Vendors")');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Invite Restaurant")');
    await page.fill('input[placeholder="Paste the restaurant\'s shop ID"]', CAKE_STUDIO_SHOP_ID);
    await page.click('button:has-text("Send Request")');

    await expect(page.getByText('Cake Studio')).toBeVisible({ timeout: 8_000 });
    // Pending filter pill should now show at least 1
    await page.click('button:has-text("Pending")');
    await expect(page.getByText('Cake Studio')).toBeVisible();
    await page.screenshot({ path: 'screenshots/request-flow-1-mall-invited.png', fullPage: true });
  });

  test('Restaurant owner sees the request and accepts it', async ({ page }) => {
    await loginAs(page, CAKE_STUDIO_OWNER);
    await assertLoggedIn(page, CAKE_STUDIO_OWNER);
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Dashboard/MallRequests');

    await expect(page.getByText('Mall link requests')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Forum Mall Bengaluru', { exact: false })).toBeVisible();
    await page.screenshot({ path: 'screenshots/request-flow-2-owner-sees-banner.png', fullPage: true });

    await page.click('button:has-text("Accept")');
    await expect(page.getByText('Mall link requests')).not.toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/request-flow-3-owner-accepted.png', fullPage: true });
  });

  test('Mall admin sees the restaurant is now Active', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.click('button:has-text("Vendors")');
    await page.click('button:has-text("Active")');
    await expect(page.getByText('Cake Studio')).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/request-flow-4-mall-sees-active.png', fullPage: true });
  });
});

test.describe('Food Court QR Flow', () => {
  test('Mall QR tab shows a real, working Food Court QR', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.click('button:has-text("Mall QR")');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('img[alt="Food Court QR"]')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(`/food-court/${FORUM_MALL_ID}`)).toBeVisible();
    await page.screenshot({ path: 'screenshots/food-court-5-mall-qr-real.png', fullPage: true });
  });

  test('Unauthenticated customer sees the restaurant list and can open a real menu', async ({ page, context }) => {
    // Fresh, unauthenticated context — no login at all, simulating a QR scan.
    await page.goto(`/food-court/${FORUM_MALL_ID}`);
    await assertNoCrash(page, 'FoodCourtHome');
    await expect(page.getByText('Forum Mall Bengaluru')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Spice Route')).toBeVisible();
    await expect(page.getByText('Cake Studio')).toBeVisible(); // just-accepted restaurant shows up here too
    await page.screenshot({ path: 'screenshots/food-court-6-restaurant-list.png', fullPage: true });

    await page.click('button:has-text("Spice Route")');
    await page.waitForURL(url => url.pathname.startsWith('/menu/'), { timeout: 8_000 });
    await assertNoCrash(page, 'FoodCourt/CustomerMenu');
    await page.screenshot({ path: 'screenshots/food-court-7-restaurant-menu.png', fullPage: true });
  });
});
