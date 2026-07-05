// Comprehensive, recorded walkthrough of the Kitchen Staff role — lands on the
// Kitchen Display (KOT) by default (ROLE_DEFAULT_ROUTE.KITCHEN = '/kot') and
// only has access to dashboard, orders, kot (ROLE_PERMISSIONS.KITCHEN).
// Produces a full video for the walkthrough presentation.
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

test('Kitchen Staff — full walkthrough of every accessible page', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // Kitchen's default landing page is the Kitchen Display (KOT), not /dashboard
  await loginAs(page, USERS.KITCHEN);
  await page.waitForURL(u => u.pathname.startsWith('/kot'), { timeout: 10_000 }).catch(() => page.goto('/kot'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/kit-01-kot.png', fullPage: true });
  const minimizeBtn = page.locator('button:has-text("Minimize")').first();
  if (await minimizeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await minimizeBtn.click(); await pause(page);
  }

  for (const [label, shot] of [
    ['Dashboard', 'kit-02-dashboard'],
    ['Orders', 'kit-03-orders'],
  ]) {
    await nav(page, label);
    await page.screenshot({ path: `screenshots/${shot}.png`, fullPage: true });
  }

  // Confirm Menu/Billing/Settings are genuinely absent for Kitchen staff
  await expect(page.locator('aside a:has-text("Menu Items")')).toHaveCount(0);
  await expect(page.locator('aside a:has-text("POS / Billing")')).toHaveCount(0);
  await expect(page.locator('aside a:has-text("Settings")')).toHaveCount(0);

  const signOutBtn = page.locator('button:has-text("Sign out")').first();
  if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutBtn.click();
    await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 }).catch(() => {});
    await pause(page);
    await page.screenshot({ path: 'screenshots/kit-04-signed-out.png' });
  }

  console.log('=== CONSOLE ERRORS DURING KITCHEN WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
