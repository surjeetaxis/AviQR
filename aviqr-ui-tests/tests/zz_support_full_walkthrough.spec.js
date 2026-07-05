// Comprehensive, recorded walkthrough of the Support Agent flow — every nav
// tab, the priority filter, logout, and the auth-guard redirect. Produces a
// full video (not retain-on-failure) so the whole session can be watched end
// to end.
import { test, expect } from '@playwright/test';
import { loginAs, goToTab, USERS } from './helpers.js';

test.use({ viewport: { width: 3840, height: 2160 }, video: { mode: 'on', size: { width: 3840, height: 2160 } } });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

test('Support Agent — full walkthrough of every tab and major action', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // ── Login ──────────────────────────────────────────────────────────────
  await loginAs(page, USERS.SUPPORT);
  await page.waitForURL(u => u.pathname.startsWith('/support'), { timeout: 10_000 }).catch(() => page.goto('/support'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);

  // ── TC1: Overview ──────────────────────────────────────────────────────
  await expect(page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first()).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/sup-01-overview.png', fullPage: true });

  // ── TC2: Tickets + priority filter ─────────────────────────────────────
  await goToTab(page, 'Tickets'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-02-tickets.png', fullPage: true });
  const urgentBtn = page.locator('button:has-text("Urgent"), button:has-text("High"), [class*="filter"]').first();
  if (await urgentBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await urgentBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/sup-03-tickets-filtered.png', fullPage: true });
  }

  // ── TC3: Orders / Payments / Users ─────────────────────────────────────
  await goToTab(page, 'Orders'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-04-orders.png', fullPage: true });
  await goToTab(page, 'Payments'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-05-payments.png', fullPage: true });
  await goToTab(page, 'Users'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-06-users.png', fullPage: true });

  // ── TC4: Logout + auth-guard redirect ──────────────────────────────────
  await page.click('button:has-text("Sign out"), button:has-text("Logout")');
  await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/sup-07-signed-out.png', fullPage: true });

  await page.goto('/support');
  await page.waitForURL(u => u.pathname === '/login', { timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/sup-08-auth-guard-redirect.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING SUPPORT WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
