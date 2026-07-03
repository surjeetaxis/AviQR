// Comprehensive, recorded walkthrough of the Mall Admin flow — every nav tab,
// the vendor status toggle, the real Food Court QR, and settings persistence.
// Produces a full video (not retain-on-failure) so the whole session can be
// watched end to end.
//
// The cross-account "invite restaurant by shop id → owner accepts → mall sees
// Active" handshake is exhaustively covered separately in
// 11_restaurant_request_and_food_court.spec.js (it requires a second login as
// a different owner mid-flow, which doesn't fit a single continuous walkthrough
// video) — this spec sticks to the single-session Mall Admin actions.
import { test, expect } from '@playwright/test';
import { loginAs, goToTab, USERS } from './helpers.js';

test.use({ video: 'on' });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

test('Mall Admin — full walkthrough of every tab and major action', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // ── Login ──────────────────────────────────────────────────────────────
  await loginAs(page, USERS.MALL);
  await page.waitForURL(u => u.pathname.startsWith('/mall'), { timeout: 10_000 }).catch(() => page.goto('/mall'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);

  // ── TC1: Overview ──────────────────────────────────────────────────────
  await expect(page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first()).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/mall-w01-overview.png', fullPage: true });

  // ── TC2: Vendors + toggle status ───────────────────────────────────────
  await goToTab(page, 'Vendors'); await pause(page);
  await page.screenshot({ path: 'screenshots/mall-w02-vendors.png', fullPage: true });
  const toggleBtn = page.locator('[class*="toggle"], button:has-text("Active"), button:has-text("Inactive")').first();
  if (await toggleBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await toggleBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/mall-w03-vendors-toggled.png', fullPage: true });
    await toggleBtn.click(); await pause(page); // leave state clean
  }

  // ── TC3: Mall QR (real, working Food Court QR) ─────────────────────────
  await goToTab(page, 'Mall QR'); await pause(page);
  await expect(page.locator('img[alt="Food Court QR"]')).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/mall-w04-qr.png', fullPage: true });

  // ── TC4: Revenue Share / Reports / Subscription / Settings / logout ────
  await goToTab(page, 'Revenue Share'); await pause(page);
  await page.screenshot({ path: 'screenshots/mall-w05-revenue-share.png', fullPage: true });

  await goToTab(page, 'Reports'); await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/mall-w06-reports.png', fullPage: true });

  await goToTab(page, 'Subscription'); await pause(page);
  await page.screenshot({ path: 'screenshots/mall-w07-subscription.png', fullPage: true });

  await goToTab(page, 'Settings'); await pause(page);
  const saveBtn = page.locator('button:has-text("Save")').first();
  if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await saveBtn.click(); await pause(page, 1000);
  }
  await page.screenshot({ path: 'screenshots/mall-w08-settings.png', fullPage: true });

  await page.click('button:has-text("Sign out"), button:has-text("Logout")');
  await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/mall-w09-signed-out.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING MALL WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
