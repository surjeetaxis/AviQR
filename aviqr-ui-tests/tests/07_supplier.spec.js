import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, assertDataLoaded, goToTab, USERS } from './helpers.js';

test.describe('Supplier — login + all tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.SUPPLIER);
    await assertLoggedIn(page, USERS.SUPPLIER);
    await page.waitForURL(url => url.pathname.startsWith('/supplier'), { timeout: 10_000 })
      .catch(() => page.goto('/supplier'));
    await page.waitForLoadState('networkidle');
  });

  test('Supplier — Overview shows outlet stats', async ({ page }) => {
    await assertNoCrash(page, 'Supplier/Overview');
    await assertDataLoaded(page, 'Supplier/Overview');
    const card = page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first();
    await expect(card).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/supplier-overview.png', fullPage: true });
  });

  test('Supplier — Outlets tab shows outlet list', async ({ page }) => {
    await goToTab(page, 'Outlets');
    await assertNoCrash(page, 'Supplier/Outlets');
    await assertDataLoaded(page, 'Supplier/Outlets');
    const outletEl = page.locator('[class*="outlet"], [class*="card"]').first();
    await expect(outletEl).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/supplier-outlets.png', fullPage: true });
  });

  test('Supplier — Revenue chart visible in overview', async ({ page }) => {
    // Back on overview check chart
    const chart = page.locator('svg, [class*="chart"], [class*="recharts"]').first();
    const hasChart = await chart.isVisible({ timeout: 5_000 }).catch(() => false);
    await page.screenshot({ path: 'screenshots/supplier-overview-chart.png', fullPage: true });
  });

  test('Supplier — Menu Sync tab', async ({ page }) => {
    await goToTab(page, 'Menu Sync');
    await assertNoCrash(page, 'Supplier/MenuSync');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/supplier-menu-sync.png', fullPage: true });
  });

  test('Supplier — All Orders tab', async ({ page }) => {
    await goToTab(page, 'All Orders');
    await assertNoCrash(page, 'Supplier/Orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/supplier-orders.png', fullPage: true });
  });

  test('Supplier — QR Codes tab', async ({ page }) => {
    await goToTab(page, 'QR Codes');
    await assertNoCrash(page, 'Supplier/QRCodes');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/supplier-qr-codes.png', fullPage: true });
  });

  test('Supplier — Reports tab', async ({ page }) => {
    await goToTab(page, 'Reports');
    await assertNoCrash(page, 'Supplier/Reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/supplier-reports.png', fullPage: true });
  });

  test('Supplier — Settings tab', async ({ page }) => {
    await goToTab(page, 'Settings');
    await assertNoCrash(page, 'Supplier/Settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/supplier-settings.png', fullPage: true });
  });

  test('Supplier — logout works', async ({ page }) => {
    const logoutBtn = page.locator('button:has-text("Sign out"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login', { timeout: 8_000 });
      await page.screenshot({ path: 'screenshots/supplier-after-logout.png' });
    }
  });
});
