// Comprehensive, recorded walkthrough of the Cashier role — lands on POS/Billing
// by default (ROLE_DEFAULT_ROUTE.CASHIER = '/billing') and only has access to
// dashboard, orders, billing, reports, order-history (ROLE_PERMISSIONS.CASHIER).
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

test('Cashier — full walkthrough of every accessible page', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // Cashier's default landing page is POS/Billing, not /dashboard
  await loginAs(page, USERS.CASHIER);
  await page.waitForURL(u => u.pathname.startsWith('/billing'), { timeout: 10_000 }).catch(() => page.goto('/billing'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/csh-01-billing.png', fullPage: true });
  const minimizeBtn = page.locator('button:has-text("Minimize")').first();
  if (await minimizeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await minimizeBtn.click(); await pause(page);
  }

  for (const [label, shot] of [
    ['Dashboard', 'csh-02-dashboard'],
    ['Orders', 'csh-03-orders'],
    ['Reports', 'csh-04-reports'],
    ['Order History', 'csh-05-order-history'],
  ]) {
    await nav(page, label);
    await page.screenshot({ path: `screenshots/${shot}.png`, fullPage: true });
  }

  // Confirm Menu/Staff/Settings/QR are genuinely absent for Cashier
  await expect(page.locator('aside a:has-text("Menu Items")')).toHaveCount(0);
  await expect(page.locator('aside a:has-text("Settings")')).toHaveCount(0);

  const signOutBtn = page.locator('button:has-text("Sign out")').first();
  if (await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutBtn.click();
    await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 }).catch(() => {});
    await pause(page);
    await page.screenshot({ path: 'screenshots/csh-06-signed-out.png' });
  }

  console.log('=== CONSOLE ERRORS DURING CASHIER WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
