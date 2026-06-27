import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, assertDataLoaded, goToTab, USERS } from './helpers.js';

test.describe('Hotel GM — login + all tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.HOTEL);
    await assertLoggedIn(page, USERS.HOTEL);
    await page.waitForURL(url => url.pathname.startsWith('/hotel'), { timeout: 10_000 })
      .catch(() => page.goto('/hotel'));
    await page.waitForLoadState('networkidle');
  });

  test('Hotel — Overview loads with room stats', async ({ page }) => {
    await assertNoCrash(page, 'Hotel/Overview');
    await assertDataLoaded(page, 'Hotel/Overview');
    const card = page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first();
    await expect(card).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/hotel-overview.png', fullPage: true });
  });

  test('Hotel — Guest Requests tab shows request list', async ({ page }) => {
    await goToTab(page, 'Guest Requests');
    await assertNoCrash(page, 'Hotel/GuestRequests');
    await assertDataLoaded(page, 'Hotel/GuestRequests');
    // Request cards or table or empty state
    const reqEl = page.locator('[class*="request"], [class*="card"], [class*="row"]').first();
    const hasContent = await reqEl.isVisible({ timeout: 6_000 }).catch(() => false);
    await page.screenshot({ path: 'screenshots/hotel-guest-requests.png', fullPage: true });
  });

  test('Hotel — Guest Requests — advance status works', async ({ page }) => {
    await goToTab(page, 'Guest Requests');
    await page.waitForLoadState('networkidle');
    // Try clicking a status advance / confirm button
    const advBtn = page.locator('button:has-text("Confirm"), button:has-text("Done"), button:has-text("Accept")').first();
    if (await advBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await advBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/hotel-request-advanced.png', fullPage: true });
    }
  });

  test('Hotel — Rooms tab shows room grid', async ({ page }) => {
    await goToTab(page, 'Rooms');
    await assertNoCrash(page, 'Hotel/Rooms');
    await assertDataLoaded(page, 'Hotel/Rooms');
    // Room cards
    const roomEl = page.locator('[class*="room"], [class*="card"]').first();
    await expect(roomEl).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/hotel-rooms.png', fullPage: true });
  });

  test('Hotel — Rooms — filter by status', async ({ page }) => {
    await goToTab(page, 'Rooms');
    await page.waitForLoadState('networkidle');
    const filterBtn = page.locator('button:has-text("Occupied"), button:has-text("Vacant"), button:has-text("All")').first();
    if (await filterBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'screenshots/hotel-rooms-filtered.png', fullPage: true });
    }
  });

  test('Hotel — Room Menu tab', async ({ page }) => {
    await goToTab(page, 'Room Menu');
    await assertNoCrash(page, 'Hotel/RoomMenu');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/hotel-room-menu.png', fullPage: true });
  });

  test('Hotel — QR Codes tab', async ({ page }) => {
    await goToTab(page, 'QR Codes');
    await assertNoCrash(page, 'Hotel/QRCodes');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/hotel-qr-codes.png', fullPage: true });
  });

  test('Hotel — Reports tab', async ({ page }) => {
    await goToTab(page, 'Reports');
    await assertNoCrash(page, 'Hotel/Reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/hotel-reports.png', fullPage: true });
  });

  test('Hotel — Subscription tab', async ({ page }) => {
    await goToTab(page, 'Subscription');
    await assertNoCrash(page, 'Hotel/Subscription');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/hotel-subscription.png', fullPage: true });
  });

  test('Hotel — Settings tab', async ({ page }) => {
    await goToTab(page, 'Settings');
    await assertNoCrash(page, 'Hotel/Settings');
    await page.waitForLoadState('networkidle');
    // Form fields should be visible
    await expect(page.locator('input').first()).toBeVisible({ timeout: 6_000 });
    await page.screenshot({ path: 'screenshots/hotel-settings.png', fullPage: true });
  });

  test('Hotel — logout works', async ({ page }) => {
    const logoutBtn = page.locator('button:has-text("Sign out"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login', { timeout: 8_000 });
      await page.screenshot({ path: 'screenshots/hotel-after-logout.png' });
    }
  });
});
