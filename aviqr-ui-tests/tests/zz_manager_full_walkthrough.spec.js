// Comprehensive, recorded walkthrough of the Manager role — every sidebar item
// a Manager has access to (dashboard, orders, billing, kot, menu, variations,
// qr-codes, inventory, raw-materials, loyalty, reports, analytics, order-history,
// ai — see ROLE_PERMISSIONS.MANAGER in AuthContext.jsx). No Settings/Staff tabs —
// those are Owner-only. Produces a full video for the walkthrough presentation.
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test.use({ viewport: { width: 3840, height: 2160 }, video: { mode: 'on', size: { width: 3840, height: 2160 } } });

const pause = (page, ms = 600) => page.waitForTimeout(ms);
const nav = async (page, label) => {
  const link = page.locator(`aside a:has-text("${label}")`).first();
  if (!(await link.isVisible({ timeout: 3000 }).catch(() => false))) return false;
  await link.click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page);
  return true;
};

test('Manager — full walkthrough of every accessible page', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  await loginAs(page, USERS.MANAGER);
  await page.waitForURL(u => u.pathname.startsWith('/dashboard'), { timeout: 10_000 }).catch(() => page.goto('/dashboard'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/mgr-01-dashboard.png', fullPage: true });

  for (const [label, shot] of [
    ['Orders', 'mgr-02-orders'],
    ['POS / Billing', 'mgr-03-billing'],
    ['Kitchen Display', 'mgr-04-kot'],
    ['Menu Items', 'mgr-05-menu'],
    ['Variants & Add-ons', 'mgr-06-variations'],
    ['QR Codes', 'mgr-07-qr-codes'],
    ['Stock Levels', 'mgr-08-inventory'],
    ['Raw Materials', 'mgr-09-raw-materials'],
    ['Loyalty Program', 'mgr-10-loyalty'],
    ['Reports', 'mgr-11-reports'],
    ['Advanced Analytics', 'mgr-12-analytics'],
    ['Order History', 'mgr-13-order-history'],
    ['AI Features', 'mgr-14-ai-features'],
  ]) {
    const opened = await nav(page, label);
    if (opened) {
      const minimizeBtn = page.locator('button:has-text("Minimize")').first();
      if (await minimizeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await page.screenshot({ path: `screenshots/${shot}.png`, fullPage: true });
        await minimizeBtn.click(); await pause(page);
      } else {
        await page.screenshot({ path: `screenshots/${shot}.png`, fullPage: true });
      }
    }
  }

  // Settings/Staff are Owner-only — confirm they're genuinely absent for Manager
  await expect(page.locator('aside a:has-text("Settings")')).toHaveCount(0);
  await expect(page.locator('aside a:has-text("Staff")')).toHaveCount(0);

  const signOutBtn = page.locator('button:has-text("Sign out")').first();
  if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutBtn.click();
    await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 }).catch(() => {});
    await pause(page);
    await page.screenshot({ path: 'screenshots/mgr-15-signed-out.png' });
  }

  console.log('=== CONSOLE ERRORS DURING MANAGER WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
