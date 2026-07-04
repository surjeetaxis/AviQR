// Comprehensive, recorded walkthrough of the Hotel Owner flow — every nav tab,
// every major button/toggle/form. Produces a full video (not retain-on-failure)
// so the whole session can be watched end to end, and is used here to actively
// hunt for more styling/functional bugs like the QR Management "Generate" button.
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test.use({ video: 'on' });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

test('Hotel Owner — full walkthrough of every tab and major action', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // ── Login ──────────────────────────────────────────────────────────────
  await loginAs(page, USERS.HOTEL);
  await page.waitForURL(u => u.pathname.startsWith('/hotel'), { timeout: 10_000 }).catch(() => page.goto('/hotel'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);

  // ── Overview ───────────────────────────────────────────────────────────
  await page.click('button:has-text("Overview")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.locator('.admin-kpi-card').first()).toBeVisible();
  await page.screenshot({ path: 'screenshots/walk-01-overview.png', fullPage: true });

  // ── Guest Requests ─────────────────────────────────────────────────────
  await page.click('button:has-text("Guest Requests")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-02-guest-requests.png', fullPage: true });
  const advanceBtn = page.locator('.req-action-btn').first();
  if (await advanceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await advanceBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/walk-02b-request-advanced.png', fullPage: true });
  }

  // ── Bookings ───────────────────────────────────────────────────────────
  await page.click('button:has-text("Bookings")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-03-bookings.png', fullPage: true });
  const confirmBtn = page.locator('button:has-text("Confirm")').first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click(); await pause(page);
  }

  // ── Guests ─────────────────────────────────────────────────────────────
  await page.click('button:has-text("Guests")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.locator('h1.page-title')).toHaveText('Guests');
  await page.screenshot({ path: 'screenshots/walk-04-guests.png', fullPage: true });

  // ── Outlets ────────────────────────────────────────────────────────────
  await page.click('button:has-text("Outlets")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-05-outlets.png', fullPage: true });
  const outletQrToggle = page.locator('.room-qr-row .toggle-btn').first();
  if (await outletQrToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await outletQrToggle.click(); await pause(page);
    await outletQrToggle.click(); await pause(page); // toggle back to leave state clean
  }

  // ── Hotel Staff ────────────────────────────────────────────────────────
  await page.click('button:has-text("Hotel Staff")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.locator('h1.page-title')).toHaveText('Hotel Staff');
  await page.screenshot({ path: 'screenshots/walk-06-hotel-staff.png', fullPage: true });

  // ── Rooms ──────────────────────────────────────────────────────────────
  await page.click('button:has-text("Rooms")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-07-rooms.png', fullPage: true });
  const occupiedFilter = page.locator('.support-filter-tab:has-text("Occupied")');
  if (await occupiedFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
    await occupiedFilter.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/walk-07b-rooms-filtered.png', fullPage: true });
    await page.locator('.support-filter-tab:has-text("All")').click(); await pause(page);
  }
  const roomQrToggle = page.locator('.room-qr-row .toggle-btn').first();
  if (await roomQrToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await roomQrToggle.click(); await pause(page);
    await roomQrToggle.click(); await pause(page);
  }

  // ── Room Service Menu ──────────────────────────────────────────────────
  await page.click('button:has-text("Room Service Menu")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-08-room-service-menu.png', fullPage: true });
  const availToggle = page.locator('.toggle-btn').first();
  if (await availToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await availToggle.click(); await pause(page);
    await availToggle.click(); await pause(page);
  }

  // ── Housekeeping ───────────────────────────────────────────────────────
  await page.click('button:has-text("Housekeeping")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-09-housekeeping.png', fullPage: true });

  // ── Laundry ────────────────────────────────────────────────────────────
  await page.click('button:has-text("Laundry")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-10-laundry.png', fullPage: true });

  // ── Spa ────────────────────────────────────────────────────────────────
  await page.click('button:has-text("Spa")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.locator('h1.page-title').first()).toHaveText('Spa');
  await page.screenshot({ path: 'screenshots/walk-11-spa.png', fullPage: true });

  // ── Maintenance ────────────────────────────────────────────────────────
  await page.click('button:has-text("Maintenance")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-12-maintenance.png', fullPage: true });

  // ── QR Management (where the last bug was found) ──────────────────────
  await page.click('button:has-text("QR Management")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await expect(page.locator('h1.page-title')).toHaveText('QR Management');
  await page.screenshot({ path: 'screenshots/walk-13-qr-management.png', fullPage: true });
  // Outlets with a linked shop get a real "QR Codes" button (reusing the shop-owner
  // QR Designer); outlets with none show "No linked shop" text instead of a dead-end.
  const qrCodesBtn = page.locator('main').getByRole('button', { name: /QR Codes/ }).first();
  await expect(qrCodesBtn).toBeVisible();
  const bg = await qrCodesBtn.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)'); // must have a real background, not transparent/unstyled

  // ── Reports ────────────────────────────────────────────────────────────
  await page.click('button:has-text("Reports")');
  await page.waitForLoadState('networkidle'); await pause(page, 1200);
  await page.screenshot({ path: 'screenshots/walk-14-reports.png', fullPage: true });

  // ── Subscription ───────────────────────────────────────────────────────
  await page.click('button:has-text("Subscription")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-15-subscription.png', fullPage: true });

  // ── Settings ───────────────────────────────────────────────────────────
  await page.click('button:has-text("Settings")');
  await page.waitForLoadState('networkidle'); await pause(page);
  await page.screenshot({ path: 'screenshots/walk-16-settings.png', fullPage: true });
  const saveBtn = page.locator('button:has-text("Save")').first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click(); await pause(page, 1000);
    await page.screenshot({ path: 'screenshots/walk-16b-settings-saved.png', fullPage: true });
  }

  // ── Sign out ───────────────────────────────────────────────────────────
  await page.click('button:has-text("Sign out")');
  await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/walk-17-signed-out.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING FULL WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});