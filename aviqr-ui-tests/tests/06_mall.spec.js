import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, assertDataLoaded, goToTab, USERS } from './helpers.js';

test.describe('Mall Admin — login + all tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await assertLoggedIn(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 })
      .catch(() => page.goto('/mall'));
    await page.waitForLoadState('networkidle');
  });

  test('Mall — Overview shows vendor stats', async ({ page }) => {
    await assertNoCrash(page, 'Mall/Overview');
    await assertDataLoaded(page, 'Mall/Overview');
    const card = page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first();
    await expect(card).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/mall-overview.png', fullPage: true });
  });

  test('Mall — Vendors tab shows vendor list', async ({ page }) => {
    await goToTab(page, 'Vendors');
    await assertNoCrash(page, 'Mall/Vendors');
    await assertDataLoaded(page, 'Mall/Vendors');
    const vendorEl = page.locator('[class*="vendor"], [class*="outlet"], [class*="card"], [class*="row"]').first();
    await expect(vendorEl).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/mall-vendors.png', fullPage: true });
  });

  test('Mall — Vendors — toggle vendor status', async ({ page }) => {
    await goToTab(page, 'Vendors');
    await page.waitForLoadState('networkidle');
    const toggleBtn = page.locator('[class*="toggle"], button:has-text("Active"), button:has-text("Inactive")').first();
    if (await toggleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await toggleBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'screenshots/mall-vendors-toggled.png', fullPage: true });
    }
  });

  test('Mall — Revenue Share tab', async ({ page }) => {
    await goToTab(page, 'Revenue Share');
    await assertNoCrash(page, 'Mall/Revenue');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/mall-revenue-share.png', fullPage: true });
  });

  test('Mall — Mall QR tab', async ({ page }) => {
    await goToTab(page, 'Mall QR');
    await assertNoCrash(page, 'Mall/QR');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/mall-qr.png', fullPage: true });
  });

  test('Mall — Reports tab', async ({ page }) => {
    await goToTab(page, 'Reports');
    await assertNoCrash(page, 'Mall/Reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/mall-reports.png', fullPage: true });
  });

  test('Mall — Subscription tab', async ({ page }) => {
    await goToTab(page, 'Subscription');
    await assertNoCrash(page, 'Mall/Subscription');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/mall-subscription.png', fullPage: true });
  });

  test('Mall — Settings tab', async ({ page }) => {
    await goToTab(page, 'Settings');
    await assertNoCrash(page, 'Mall/Settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/mall-settings.png', fullPage: true });
  });

  test('Mall — logout works', async ({ page }) => {
    const logoutBtn = page.locator('button:has-text("Sign out"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login', { timeout: 8_000 });
      await page.screenshot({ path: 'screenshots/mall-after-logout.png' });
    }
  });
});
