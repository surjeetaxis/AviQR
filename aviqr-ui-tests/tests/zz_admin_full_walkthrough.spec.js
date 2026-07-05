// Comprehensive, recorded walkthrough of the Admin flow — every nav tab,
// every major button/search. Produces a full video (not retain-on-failure)
// so the whole session can be watched end to end.
import { test, expect } from '@playwright/test';
import { loginAs, goToTab, USERS } from './helpers.js';

test.use({ viewport: { width: 3840, height: 2160 }, video: { mode: 'on', size: { width: 3840, height: 2160 } } });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

test('Admin — full walkthrough of every tab and major action', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // ── Login ──────────────────────────────────────────────────────────────
  await loginAs(page, USERS.ADMIN);
  await page.waitForURL(u => u.pathname.startsWith('/admin'), { timeout: 10_000 }).catch(() => page.goto('/admin'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);

  // ── TC1: Overview ──────────────────────────────────────────────────────
  await expect(page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first()).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/adm-01-overview.png', fullPage: true });

  // ── TC2: Users + search ────────────────────────────────────────────────
  await goToTab(page, 'Users');
  await pause(page);
  await page.screenshot({ path: 'screenshots/adm-02-users.png', fullPage: true });
  const search = page.locator('input[placeholder*="search" i], input[type="search"]').first();
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill('spice'); await pause(page);
    await page.screenshot({ path: 'screenshots/adm-03-users-search.png', fullPage: true });
    await search.fill(''); await pause(page);
  }

  // ── TC3: Shops / Orders / Payments / Hotels / Malls ────────────────────
  const crossTenantTabs = [
    ['Shops', 'adm-04-shops'],
    ['Orders', 'adm-05-orders'],
    ['Payments', 'adm-06-payments'],
    ['Hotels', 'adm-07-hotels'],
    ['Malls', 'adm-08-malls'],
  ];
  for (const [tab, file] of crossTenantTabs) {
    await goToTab(page, tab); await pause(page);
    await page.screenshot({ path: `screenshots/${file}.png`, fullPage: true });
  }

  // ── TC4: Reports / Settings / QR Codes / logout ────────────────────────
  await goToTab(page, 'Reports'); await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/adm-09-reports.png', fullPage: true });

  await goToTab(page, 'Settings'); await pause(page);
  await page.screenshot({ path: 'screenshots/adm-10-settings.png', fullPage: true });

  await goToTab(page, 'QR Codes'); await pause(page);
  await page.screenshot({ path: 'screenshots/adm-11-qrcodes.png', fullPage: true });

  await page.click('button:has-text("Sign out"), button:has-text("Logout"), button:has-text("Log out")');
  await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/adm-12-signed-out.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING ADMIN WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
