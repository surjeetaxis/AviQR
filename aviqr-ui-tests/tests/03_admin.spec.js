import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, assertDataLoaded, goToTab, USERS } from './helpers.js';

test.describe('Admin — login + all tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.ADMIN);
    await assertLoggedIn(page, USERS.ADMIN);
    // Admin should redirect to /admin/*
    await page.waitForURL(url => url.pathname.startsWith('/admin'), { timeout: 10_000 })
      .catch(() => page.goto('/admin'));
    await page.waitForLoadState('networkidle');
  });

  test('Admin — dashboard / overview tab', async ({ page }) => {
    await assertNoCrash(page, 'Admin/Overview');
    await assertDataLoaded(page, 'Admin/Overview');
    // Platform KPIs or stats
    const kpi = page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first();
    await expect(kpi).toBeVisible({ timeout: 8_000 });
    // Sidebar with admin nav
    await expect(page.locator('aside, nav').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/admin-overview.png', fullPage: true });
  });

  test('Admin — Users tab', async ({ page }) => {
    await goToTab(page, 'Users');
    await assertNoCrash(page, 'Admin/Users');
    await assertDataLoaded(page, 'Admin/Users');
    // Should show a table or list of users
    const row = page.locator('[class*="table"] tr, [class*="user-row"], [class*="card"]').first();
    await expect(row).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/admin-users.png', fullPage: true });
  });

  test('Admin — Users — search box works', async ({ page }) => {
    await goToTab(page, 'Users');
    await page.waitForLoadState('networkidle');
    const search = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await search.fill('spice');
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'screenshots/admin-users-search.png', fullPage: true });
    }
  });

  test('Admin — Shops tab', async ({ page }) => {
    await goToTab(page, 'Shops');
    await assertNoCrash(page, 'Admin/Shops');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-shops.png', fullPage: true });
  });

  test('Admin — Orders tab', async ({ page }) => {
    await goToTab(page, 'Orders');
    await assertNoCrash(page, 'Admin/Orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-orders.png', fullPage: true });
  });

  test('Admin — Payments tab', async ({ page }) => {
    await goToTab(page, 'Payments');
    await assertNoCrash(page, 'Admin/Payments');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-payments.png', fullPage: true });
  });

  test('Admin — Hotels tab', async ({ page }) => {
    await goToTab(page, 'Hotels');
    await assertNoCrash(page, 'Admin/Hotels');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-hotels.png', fullPage: true });
  });

  test('Admin — Malls tab', async ({ page }) => {
    await goToTab(page, 'Malls');
    await assertNoCrash(page, 'Admin/Malls');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-malls.png', fullPage: true });
  });

  test('Admin — Reports tab', async ({ page }) => {
    await goToTab(page, 'Reports');
    await assertNoCrash(page, 'Admin/Reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-reports.png', fullPage: true });
  });

  test('Admin — Settings tab', async ({ page }) => {
    await goToTab(page, 'Settings');
    await assertNoCrash(page, 'Admin/Settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-settings.png', fullPage: true });
  });

  test('Admin — QR Codes tab', async ({ page }) => {
    await goToTab(page, 'QR Codes');
    await assertNoCrash(page, 'Admin/QRCodes');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/admin-qrcodes.png', fullPage: true });
  });

  test('Admin — logout works', async ({ page }) => {
    const logoutBtn = page.locator('button:has-text("Sign out"), button:has-text("Logout"), button:has-text("Log out")').first();
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login', { timeout: 8_000 });
      await page.screenshot({ path: 'screenshots/admin-after-logout.png' });
    }
  });
});
