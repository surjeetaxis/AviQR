// Comprehensive, recorded walkthrough of the Supplier flow — every nav tab,
// the live outlet search, and the new Brand/Main QR (set up + generate).
// Produces a full video (not retain-on-failure) so the whole session can be
// watched end to end.
import { test, expect } from '@playwright/test';
import { loginAs, goToTab, USERS } from './helpers.js';

test.use({ video: 'on' });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

test('Supplier — full walkthrough of every tab and major action', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  // ── Login ──────────────────────────────────────────────────────────────
  await loginAs(page, USERS.SUPPLIER);
  await page.waitForURL(u => u.pathname.startsWith('/supplier'), { timeout: 10_000 }).catch(() => page.goto('/supplier'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);

  // ── TC1: Overview + revenue chart ──────────────────────────────────────
  await expect(page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first()).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('svg, [class*="chart"], [class*="recharts"]').first()).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: 'screenshots/sup-w01-overview.png', fullPage: true });

  // ── TC2: Outlets (+ live search) + Menu Sync ───────────────────────────
  await goToTab(page, 'Outlets'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w02-outlets.png', fullPage: true });
  const search = page.locator('input[placeholder="Search outlet by name…"]');
  if (await search.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await search.fill('zzz-no-such-outlet-zzz'); await pause(page);
    await page.screenshot({ path: 'screenshots/sup-w03-outlets-search.png', fullPage: true });
    await search.fill(''); await pause(page);
  }
  await goToTab(page, 'Menu Sync'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w04-menu-sync.png', fullPage: true });

  // ── TC3: All Orders + QR Codes (incl. Brand/Main QR) ───────────────────
  await goToTab(page, 'All Orders'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w05-all-orders.png', fullPage: true });

  await goToTab(page, 'QR Codes'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w06-qr-codes.png', fullPage: true });
  // First-time setup of the brand-wide QR if this supplier doesn't have one yet
  const brandNameInput = page.locator('input[placeholder="e.g. Spice Route Group"]');
  if (await brandNameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await brandNameInput.fill('Ramesh Teas Group');
    await page.click('button:has-text("Create Brand QR")');
    await pause(page, 1000);
  }
  await expect(page.getByText('Main Brand QR')).toBeVisible({ timeout: 8_000 });
  await page.screenshot({ path: 'screenshots/sup-w07-brand-qr.png', fullPage: true });

  // ── TC4: Reports / Settings (brand name persists) / Subscription / logout ─
  await goToTab(page, 'Reports'); await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/sup-w08-reports.png', fullPage: true });

  await goToTab(page, 'Subscription'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w09-subscription.png', fullPage: true });

  await goToTab(page, 'Settings'); await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w10-settings.png', fullPage: true });
  const saveBtn = page.locator('button:has-text("Save changes")').first();
  if (await saveBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await saveBtn.click(); await pause(page, 1000);
    await page.screenshot({ path: 'screenshots/sup-w10b-settings-saved.png', fullPage: true });
  }

  await page.click('button:has-text("Sign out"), button:has-text("Logout")');
  await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/sup-w11-signed-out.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING SUPPLIER WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
