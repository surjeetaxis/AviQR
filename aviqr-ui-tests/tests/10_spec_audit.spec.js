// Spec-compliance audit: full-sidebar screenshots for each of the 4 business-type
// dashboards, used as visual proof of exactly which nav items exist today.
import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, USERS } from './helpers.js';

test.describe('Spec audit — full sidebar screenshots', () => {
  test('Restaurant Owner — full sidebar', async ({ page }) => {
    await loginAs(page, USERS.OWNER);
    await assertLoggedIn(page, USERS.OWNER);
    await page.waitForURL(url => url.pathname.startsWith('/dashboard'), { timeout: 10_000 }).catch(() => {});
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-restaurant-sidebar.png', fullPage: true });
  });

  test('Supplier — full sidebar', async ({ page }) => {
    await loginAs(page, USERS.SUPPLIER);
    await assertLoggedIn(page, USERS.SUPPLIER);
    await page.waitForURL(url => url.pathname.startsWith('/supplier'), { timeout: 10_000 }).catch(() => page.goto('/supplier'));
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-supplier-sidebar.png', fullPage: true });
  });

  test('Hotel — full sidebar', async ({ page }) => {
    await loginAs(page, USERS.HOTEL);
    await assertLoggedIn(page, USERS.HOTEL);
    await page.waitForURL(url => url.pathname.startsWith('/hotel'), { timeout: 10_000 }).catch(() => page.goto('/hotel'));
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-hotel-sidebar.png', fullPage: true });
  });

  test('Mall — full sidebar', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await assertLoggedIn(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-mall-sidebar.png', fullPage: true });
  });

  test('Mall — Vendors tab (no Menu/Inventory/Kitchen/Restaurant-Staff tabs anywhere)', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.click('button:has-text("Vendors")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-mall-vendors.png', fullPage: true });
  });

  test('Mall — Add vendor form fields (no restaurant-request/invite workflow)', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.click('button:has-text("Vendors")');
    await page.click('button:has-text("Add vendor")');
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshots/audit-mall-add-vendor-form.png', fullPage: true });
  });

  test('Mall — QR tab (mocked data, no real generate/design)', async ({ page }) => {
    await loginAs(page, USERS.MALL);
    await page.waitForURL(url => url.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
    await page.click('button:has-text("Mall QR")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-mall-qr.png', fullPage: true });
  });

  test('Supplier — Outlets tab (no Add/Remove Outlet buttons)', async ({ page }) => {
    await loginAs(page, USERS.SUPPLIER);
    await page.waitForURL(url => url.pathname.startsWith('/supplier'), { timeout: 10_000 }).catch(() => page.goto('/supplier'));
    await page.click('button:has-text("Outlets")');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/audit-supplier-outlets.png', fullPage: true });
  });
});
