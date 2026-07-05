// Comprehensive, recorded walkthrough of a brand-new Owner signing up from
// scratch — role picker → account details → real backend registration →
// the Onboarding wizard (create restaurant → add first dish → generate QR →
// finish) → lands on the real, live Dashboard. Unlike every other zz_* video,
// this one does NOT log into a pre-seeded demo account — it creates one.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 3840, height: 2160 }, video: { mode: 'on', size: { width: 3840, height: 2160 } } });

const pause = (page, ms = 600) => page.waitForTimeout(ms);

test('New user sign-up — register a restaurant owner and complete onboarding', async ({ page }) => {
  test.slow(); // 4K screenshots/video encoding take longer; triples the 45s default timeout
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(`[pageerror] ${e.message}`));

  const stamp = Date.now();
  const newUser = {
    name: 'Priya Sharma',
    email: `priya.demo.${stamp}@aviqr.in`,
    phone: '9' + String(stamp).slice(-9),
    password: 'Demo@1234',
  };

  // ── Step 1: choose business type ────────────────────────────────────────
  await page.goto('/register');
  await page.waitForLoadState('networkidle');
  await pause(page, 800);
  await page.screenshot({ path: 'screenshots/signup-01-choose-type.png', fullPage: true });
  await page.click('button:has-text("Restaurant / Café")');
  await pause(page);
  await page.click('button:has-text("Continue")');
  await pause(page);

  // ── Step 2: account details ─────────────────────────────────────────────
  await page.screenshot({ path: 'screenshots/signup-02-details-empty.png', fullPage: true });
  await page.fill('input[placeholder="Sujeet Narayanan"]', newUser.name);
  await page.fill('input[placeholder="you@restaurant.in"]', newUser.email);
  await page.fill('input[placeholder="9845012345"]', newUser.phone);
  await page.fill('input[placeholder="Minimum 8 characters"]', newUser.password);
  await page.screenshot({ path: 'screenshots/signup-03-details-filled.png', fullPage: true });
  await page.click('label:has-text("Terms of Service")');
  await pause(page);
  await page.click('button:has-text("Create account")');

  // ── Real backend account created → lands on Dashboard with Onboarding wizard ──
  await page.waitForURL(u => u.pathname.startsWith('/dashboard'), { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await pause(page, 1000);
  await page.screenshot({ path: 'screenshots/signup-04-onboarding-step1.png', fullPage: true });

  // ── Onboarding step 1: create the restaurant ────────────────────────────
  await page.fill('input[placeholder="e.g. Spice Garden"]', 'Priya\'s Kitchen');
  await page.fill('input[placeholder="9900112233"]', '9988776655');
  await page.fill('input[placeholder="Bengaluru"]', 'Bengaluru');
  await page.fill('input[placeholder="123 MG Road"]', '45 Church Street');
  await page.screenshot({ path: 'screenshots/signup-05-onboarding-shop-filled.png', fullPage: true });
  await page.click('button:has-text("Create my restaurant")');
  await pause(page, 1200);

  // ── Onboarding step 2: add first dish ───────────────────────────────────
  await page.screenshot({ path: 'screenshots/signup-06-onboarding-step2.png', fullPage: true });
  const dishNameInput = page.locator('input[placeholder="e.g. Butter Chicken"]');
  if (await dishNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dishNameInput.fill('Butter Chicken');
    await page.fill('input[placeholder="280"]', '280');
    await page.fill('input[placeholder="e.g. Starters, Main Course"]', 'Main Course');
    await page.screenshot({ path: 'screenshots/signup-07-onboarding-dish-filled.png', fullPage: true });
    await page.click('button:has-text("Add dish")');
    await pause(page, 1000);
  }

  // ── Onboarding step 3: generate QR ──────────────────────────────────────
  await page.screenshot({ path: 'screenshots/signup-08-onboarding-step3.png', fullPage: true });
  const generateQrBtn = page.locator('button:has-text("Generate QR")');
  if (await generateQrBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await generateQrBtn.click();
    await pause(page, 1200);
  }

  // ── Onboarding step 4: done → open real dashboard ───────────────────────
  await page.screenshot({ path: 'screenshots/signup-09-onboarding-done.png', fullPage: true });
  const openDashboardBtn = page.locator('button:has-text("Open Dashboard")');
  if (await openDashboardBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await openDashboardBtn.click();
    await pause(page, 1200);
  }

  // ── Real, live Dashboard for the brand-new account ──────────────────────
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.screenshot({ path: 'screenshots/signup-10-live-dashboard.png', fullPage: true });
  const body = await page.locator('body').innerText();
  expect(body).not.toContain('undefined');
  expect(body).toContain('Priya');

  console.log('=== CONSOLE ERRORS DURING NEW USER SIGNUP WALKTHROUGH ===');
  console.log(JSON.stringify(consoleErrors, null, 2));
  expect(consoleErrors.filter(e => !e.includes('favicon'))).toEqual([]);
});
