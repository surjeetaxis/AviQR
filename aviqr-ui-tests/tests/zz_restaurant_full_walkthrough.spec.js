// Comprehensive, recorded walkthrough of the Restaurant Owner flow — every
// sidebar nav item, every major button/toggle/form. Produces a full video
// (not retain-on-failure) so the whole session can be watched end to end.
import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test.use({ viewport: { width: 3840, height: 2160 }, video: { mode: 'on', size: { width: 3840, height: 2160 } } });

const pause = (page, ms = 600) => page.waitForTimeout(ms);
const nav = async (page, label) => {
  await page.locator(`aside a:has-text("${label}")`).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await pause(page);
};

test('Restaurant Owner — full walkthrough of every sidebar item and major action', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));
  page.on('response', r => { if (r.status() >= 500) console.log(`[5xx] ${r.status()} ${r.url()}`); });

  // ── Login ──────────────────────────────────────────────────────────────
  await loginAs(page, USERS.OWNER);
  await page.waitForURL(u => u.pathname.startsWith('/dashboard'), { timeout: 10_000 }).catch(() => page.goto('/dashboard'));
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);

  // ── Dashboard ──────────────────────────────────────────────────────────
  await page.screenshot({ path: 'screenshots/rw-01-dashboard.png', fullPage: true });
  let body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');

  // ── Orders ─────────────────────────────────────────────────────────────
  await nav(page, 'Orders');
  await page.screenshot({ path: 'screenshots/rw-02-orders.png', fullPage: true });
  body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');

  // ── Full order lifecycle: New → Accepted → Preparing → Ready → Completed ─
  // Each filter chip's first card gets advanced with its real action button
  // (ADVANCE_LABEL in Orders.jsx: "Accept order" / "Start cooking" /
  // "Mark ready" / "Mark delivered"), demonstrating the whole Kanban flow.
  const advanceFirst = async (chipLabel, buttonText, shot) => {
    await page.click(`.filter-chips button:has-text("${chipLabel}")`);
    await pause(page, 500);
    await page.screenshot({ path: `screenshots/${shot}-before.png`, fullPage: true });
    const advanceBtn = page.locator(`button.action-btn--primary:has-text("${buttonText}")`).first();
    if (await advanceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await advanceBtn.click();
      await pause(page, 900);
      await page.screenshot({ path: `screenshots/${shot}-after.png`, fullPage: true });
      return true;
    }
    return false;
  };
  await advanceFirst('New',       'Accept order',    'rw-02b-lifecycle-new-to-accepted');
  await advanceFirst('Active',    'Start cooking',   'rw-02c-lifecycle-accepted-to-preparing');
  await advanceFirst('Preparing', 'Mark ready',       'rw-02d-lifecycle-preparing-to-ready');
  await advanceFirst('Ready',     'Mark delivered',   'rw-02e-lifecycle-ready-to-completed');
  await page.click('.filter-chips button:has-text("Completed")');
  await pause(page, 500);
  await page.screenshot({ path: 'screenshots/rw-02f-lifecycle-completed.png', fullPage: true });

  // ── POS / Billing (opens an immersive fullscreen view; exit via Minimize) ─
  await nav(page, 'POS / Billing');
  await page.screenshot({ path: 'screenshots/rw-03-billing.png', fullPage: true });
  const minimizeBtn = page.locator('button:has-text("Minimize")').first();
  if (await minimizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await minimizeBtn.click(); await pause(page);
  }

  // ── Kitchen Display (KOT) — also an immersive fullscreen view ──────────
  await nav(page, 'Kitchen Display');
  await page.screenshot({ path: 'screenshots/rw-04-kot.png', fullPage: true });
  const kotMinimizeBtn = page.locator('button:has-text("Minimize")').first();
  if (await kotMinimizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await kotMinimizeBtn.click(); await pause(page);
  }

  // ── Menu Items ─────────────────────────────────────────────────────────
  await nav(page, 'Menu Items');
  await page.screenshot({ path: 'screenshots/rw-05-menu.png', fullPage: true });
  const addItemBtn = page.locator('button:has-text("Add item")').first();
  if (await addItemBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await addItemBtn.click(); await pause(page);
    await page.screenshot({ path: 'screenshots/rw-05b-menu-add-form.png', fullPage: true });
    await page.locator('button:has-text("Cancel")').first().click(); await pause(page);
  }
  body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');

  // ── Variants & Add-ons ─────────────────────────────────────────────────
  await nav(page, 'Variants & Add-ons');
  await page.screenshot({ path: 'screenshots/rw-06-variations.png', fullPage: true });

  // ── QR Codes ───────────────────────────────────────────────────────────
  await nav(page, 'QR Codes');
  await page.screenshot({ path: 'screenshots/rw-07-qr-codes.png', fullPage: true });
  body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');

  // ── Stock Levels ───────────────────────────────────────────────────────
  await nav(page, 'Stock Levels');
  await page.screenshot({ path: 'screenshots/rw-08-inventory.png', fullPage: true });

  // ── Raw Materials ──────────────────────────────────────────────────────
  await nav(page, 'Raw Materials');
  await page.screenshot({ path: 'screenshots/rw-09-raw-materials.png', fullPage: true });

  // ── Loyalty Program ────────────────────────────────────────────────────
  await nav(page, 'Loyalty Program');
  await page.screenshot({ path: 'screenshots/rw-10-loyalty.png', fullPage: true });

  // ── Staff ──────────────────────────────────────────────────────────────
  await nav(page, 'Staff');
  await page.screenshot({ path: 'screenshots/rw-11-staff.png', fullPage: true });
  body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');

  // ── Reports ────────────────────────────────────────────────────────────
  await nav(page, 'Reports');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'screenshots/rw-12-reports.png', fullPage: true });

  // ── Advanced Analytics ─────────────────────────────────────────────────
  await nav(page, 'Advanced Analytics');
  await page.screenshot({ path: 'screenshots/rw-13-analytics.png', fullPage: true });

  // ── Order History ──────────────────────────────────────────────────────
  await nav(page, 'Order History');
  await page.screenshot({ path: 'screenshots/rw-14-order-history.png', fullPage: true });

  // ── AI Features ────────────────────────────────────────────────────────
  await nav(page, 'AI Features');
  await page.screenshot({ path: 'screenshots/rw-15-ai-features.png', fullPage: true });

  // ── Settings ───────────────────────────────────────────────────────────
  await nav(page, 'Settings');
  await page.screenshot({ path: 'screenshots/rw-16-settings.png', fullPage: true });
  const saveBtn = page.locator('button:has-text("Save")').first();
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await saveBtn.click(); await pause(page, 1000);
    await page.screenshot({ path: 'screenshots/rw-16b-settings-saved.png', fullPage: true });
  }

  // ── Sign out ───────────────────────────────────────────────────────────
  await page.click('button:has-text("Sign out")');
  await page.waitForURL(u => u.pathname === '/' || u.pathname === '/login', { timeout: 8_000 });
  await pause(page);
  await page.screenshot({ path: 'screenshots/rw-17-signed-out.png', fullPage: true });

  console.log('=== CONSOLE ERRORS DURING RESTAURANT WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});