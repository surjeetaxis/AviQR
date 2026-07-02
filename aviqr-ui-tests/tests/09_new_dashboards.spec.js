// Targeted coverage for the new/changed Hotel/Mall/Supplier dashboard features:
// Hotel Guests/QR Management/Spa/Reports tabs, Mall Add/Remove vendor + real
// Reports tab + Settings save, Supplier Subscription tab + outlet search.
import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, goToTab, USERS } from './helpers.js';

test.describe('Hotel — new tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.HOTEL);
    await assertLoggedIn(page, USERS.HOTEL);
    await page.waitForURL(url => url.pathname.startsWith('/hotel'), { timeout: 10_000 })
      .catch(() => page.goto('/hotel'));
    await page.waitForLoadState('networkidle');
  });

  test('Hotel — Guests tab shows in-house guest table', async ({ page }) => {
    const found = await goToTab(page, 'Guests');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Hotel/Guests');
    await expect(page.locator('h1.page-title')).toHaveText('Guests');
    await expect(page.locator('table')).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/hotel-guests.png', fullPage: true });
  });

  test('Hotel — QR Management tab shows room and outlet QR toggles', async ({ page }) => {
    const found = await goToTab(page, 'QR Management');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Hotel/QRManagement');
    await expect(page.locator('h1.page-title')).toHaveText('QR Management');
    await expect(page.locator('main').getByText('Rooms', { exact: true })).toBeVisible();
    await expect(page.locator('main').getByText('Outlets', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'screenshots/hotel-qr-management.png', fullPage: true });
  });

  test('Hotel — Spa tab shows Serenity Spa booking', async ({ page }) => {
    const found = await goToTab(page, 'Spa');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Hotel/Spa');
    await expect(page.locator('h1.page-title').first()).toHaveText('Spa');
    await expect(page.getByText('Serenity Spa')).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/hotel-spa.png', fullPage: true });
  });

  test('Hotel — Reports tab shows real Zodiac revenue (not zero)', async ({ page }) => {
    const found = await goToTab(page, 'Reports');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Hotel/Reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Zodiac', { exact: false })).toBeVisible({ timeout: 8_000 });
    const totalRevenue = await page.locator('.admin-kpi-value').first().innerText();
    expect(totalRevenue).not.toBe('₹0');
    await page.screenshot({ path: 'screenshots/hotel-reports-real.png', fullPage: true });
  });
});

test.describe('Mall — new features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await assertLoggedIn(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 })
      .catch(() => page.goto('/mall'));
    await page.waitForLoadState('networkidle');
  });

  test('Mall — Reports tab shows real per-vendor revenue (not the generic stub)', async ({ page }) => {
    const found = await goToTab(page, 'Reports');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Mall/Reports');
    await page.waitForLoadState('networkidle');
    // The old behavior fell through to a generic "Explore Vendors..." stub screen.
    await expect(page.getByText('Explore Vendors and Revenue Share tabs')).not.toBeVisible();
    await expect(page.getByText('Spice Route')).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/mall-reports-real.png', fullPage: true });
  });

  test('Mall — Add vendor via modal form persists to the list', async ({ page }) => {
    await goToTab(page, 'Vendors');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Add vendor")');
    const name = `Playwright Vendor ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Spice Route"]', name);
    await page.fill('input[placeholder="e.g. North Indian"]', 'Test Cuisine');
    await page.click('button:has-text("Add"):not(:has-text("vendor"))');
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/mall-vendor-added.png', fullPage: true });

    // Clean up: remove the vendor we just added so re-runs stay idempotent.
    const row = page.locator('tr', { hasText: name });
    page.once('dialog', d => d.accept());
    await row.locator('button.admin-row-btn-danger').click();
    await expect(page.getByText(name)).not.toBeVisible({ timeout: 8_000 });
  });

  test('Mall — Settings save persists mall profile changes', async ({ page }) => {
    await goToTab(page, 'Settings');
    await page.waitForLoadState('networkidle');
    const cityInput = page.locator('label:has-text("City") + input, label:has-text("City")').locator('xpath=following-sibling::input').first();
    const newCity = `QA City ${Date.now() % 100000}`;
    await page.fill('input[placeholder="City"]', newCity);
    await page.click('button:has-text("Save")');
    await expect(page.getByText('Saved!')).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/mall-settings-saved.png', fullPage: true });
  });
});

test.describe('Supplier — new features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.SUPPLIER);
    await assertLoggedIn(page, USERS.SUPPLIER);
    await page.waitForURL(url => url.pathname.startsWith('/supplier'), { timeout: 10_000 })
      .catch(() => page.goto('/supplier'));
    await page.waitForLoadState('networkidle');
  });

  test('Supplier — Subscription tab renders plan page', async ({ page }) => {
    const found = await goToTab(page, 'Subscription');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Supplier/Subscription');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/supplier-subscription.png', fullPage: true });
  });

  test('Supplier — Outlets search filters the list live', async ({ page }) => {
    await goToTab(page, 'Outlets');
    await page.waitForLoadState('networkidle');
    const search = page.locator('input[placeholder="Search outlet by name…"]');
    await expect(search).toBeVisible({ timeout: 8_000 });
    await search.fill('zzz-no-such-outlet-zzz');
    await expect(page.getByText('No matches')).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'screenshots/supplier-outlet-search-no-match.png', fullPage: true });
    await search.fill('');
    await expect(page.getByText('No matches')).not.toBeVisible();
  });

  test('Supplier — Reports tab shows real per-outlet revenue (not zero)', async ({ page }) => {
    const found = await goToTab(page, 'Reports');
    expect(found).toBe(true);
    await assertNoCrash(page, 'Supplier/Reports');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('MG Road', { exact: false })).toBeVisible({ timeout: 8_000 });
    const totalRevenue = await page.locator('.admin-kpi-value').first().innerText();
    expect(totalRevenue).not.toBe('₹0');
    await page.screenshot({ path: 'screenshots/supplier-reports-real.png', fullPage: true });
  });
});
