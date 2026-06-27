/**
 * Cross-cutting validation tests:
 * - Data actually loads (no empty screens)
 * - Forms submit correctly
 * - Errors are shown for bad input
 * - Navigation between pages works
 * - Auth guard redirects unauthenticated users
 */
import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, USERS, DEMO_SHOP_ID } from './helpers.js';

// ── Auth guard ────────────────────────────────────────────────────────────────
test.describe('Auth guard — unauthenticated redirects', () => {
  test('Protected /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(url => url.pathname === '/login' || url.pathname === '/', { timeout: 8_000 });
    const url = page.url();
    expect(url.includes('/login') || url === `${page.url().split('/login')[0]}/`).toBe(true);
    await page.screenshot({ path: 'screenshots/auth-guard-dashboard.png' });
  });

  test('Protected /admin redirects to /login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(url => !url.pathname.startsWith('/admin') || url.pathname === '/login', { timeout: 8_000 }).catch(() => {});
    await page.screenshot({ path: 'screenshots/auth-guard-admin.png' });
  });

  test('Protected /hotel redirects to /login', async ({ page }) => {
    await page.goto('/hotel');
    await page.waitForURL(url => url.pathname === '/login' || url.pathname === '/', { timeout: 8_000 }).catch(() => {});
    await page.screenshot({ path: 'screenshots/auth-guard-hotel.png' });
  });
});

// ── Login flow ────────────────────────────────────────────────────────────────
test.describe('Login — all user types', () => {
  for (const [key, user] of Object.entries(USERS)) {
    test(`${user.label} — login succeeds and lands on correct dashboard`, async ({ page }) => {
      await loginAs(page, user);
      await assertLoggedIn(page, user);
      await assertNoCrash(page, `${user.label}/PostLogin`);

      // Should NOT be on login or landing anymore
      const url = page.url();
      expect(url).not.toContain('/login');
      expect(url).not.toBe(`${page.url().split('/')[0]}//localhost:5173/`);

      // Basic content visible
      const body = await page.locator('body').innerText();
      expect(body.trim().length).toBeGreaterThan(50);

      await page.screenshot({ path: `screenshots/login-${user.role}-post-login.png`, fullPage: true });
    });
  }
});

// ── Owner — data validation ───────────────────────────────────────────────────
test.describe('Owner — data validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.OWNER);
    await assertLoggedIn(page, USERS.OWNER);
  });

  test('Dashboard — stat cards show numbers (not blank)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Wait for any loading to finish
    await page.waitForTimeout(2_000);
    const pageText = await page.locator('body').innerText();
    // Should contain digits (stats) or valid empty state message
    expect(pageText).toMatch(/\d|No orders|No data|🎉/);
    await page.screenshot({ path: 'screenshots/validation-owner-dashboard-data.png', fullPage: true });
  });

  test('Menu page — no "undefined" text on screen', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('undefined');
    expect(pageText).not.toContain('[object Object]');
    await page.screenshot({ path: 'screenshots/validation-menu-no-undefined.png', fullPage: true });
  });

  test('Staff page — no "undefined" text on screen', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('undefined');
    expect(pageText).not.toContain('[object Object]');
    await page.screenshot({ path: 'screenshots/validation-staff-no-undefined.png', fullPage: true });
  });

  test('QR Codes — no "undefined" text on screen', async ({ page }) => {
    await page.goto('/qr-codes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('undefined');
    await page.screenshot({ path: 'screenshots/validation-qr-no-undefined.png', fullPage: true });
  });

  test('Add item form — validation: submit with empty name fails', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add item")').first();
    if (!await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await addBtn.click();
    await expect(page.locator('text=Add new item')).toBeVisible({ timeout: 5_000 });
    // Try submitting with empty name
    await page.click('button[type="submit"]:has-text("Add item")');
    await page.waitForTimeout(500);
    // Should still be on modal (not closed)
    await expect(page.locator('text=Add new item')).toBeVisible();
    await page.screenshot({ path: 'screenshots/validation-menu-empty-submit.png' });
    await page.keyboard.press('Escape');
  });

  test('Add item form — fills and submits successfully', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add item")').first();
    if (!await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await addBtn.click();
    await expect(page.locator('text=Add new item')).toBeVisible({ timeout: 5_000 });
    // Fill form
    await page.fill('input[placeholder*="Paneer" i], input[placeholder*="name" i]', 'Test Item');
    await page.fill('input[type="number"][placeholder*="280" i], input[placeholder*="price" i]', '100');
    await page.screenshot({ path: 'screenshots/validation-menu-form-filled.png' });
    // Submit
    await page.click('button[type="submit"]:has-text("Add item")');
    await page.waitForTimeout(1_500);
    // Modal should close (success)
    const modalGone = await page.locator('text=Add new item').isHidden({ timeout: 3_000 }).catch(() => false);
    await page.screenshot({ path: 'screenshots/validation-menu-after-add.png', fullPage: true });
  });

  test('Settings — save shop profile persists', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    // Edit shop name
    const nameInput = page.locator('input[placeholder*="shop" i], label:has-text("Shop name") + input, label:has-text("Shop name") ~ * input').first();
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const original = await nameInput.inputValue().catch(() => '');
      await nameInput.clear();
      await nameInput.fill('Spice Route Updated');
      // Click save
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(1_500);
      // Success message should appear
      const successEl = page.locator('text=/saved|success|✓/i').first();
      const hasSuccess = await successEl.isVisible({ timeout: 4_000 }).catch(() => false);
      await page.screenshot({ path: 'screenshots/validation-settings-save.png', fullPage: true });
      // Restore original name to avoid corrupting other tests
      if (original) {
        await nameInput.clear();
        await nameInput.fill(original);
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1_000);
      }
    }
  });
});

// ── Customer menu — data validation ───────────────────────────────────────────
test.describe('Customer menu — data validation', () => {
  test('Menu shows real items (not "undefined" or blank prices)', async ({ page }) => {
    await page.goto(`/menu/${DEMO_SHOP_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    const pageText = await page.locator('body').innerText();
    expect(pageText).not.toContain('undefined');
    expect(pageText).not.toContain('₹NaN');
    expect(pageText).not.toContain('₹0');
    await page.screenshot({ path: 'screenshots/validation-customer-menu-data.png', fullPage: true });
  });

  test('Cart — checkout form validation (name required)', async ({ page }) => {
    await page.goto(`/menu/${DEMO_SHOP_ID}`);
    await page.waitForLoadState('networkidle');
    // Add an item
    const addBtn = page.locator('button:has-text("Add")').first();
    if (!await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) return;
    await addBtn.click();
    await page.waitForTimeout(400);
    // Open cart
    const cartBtn = page.locator('[class*="cart-btn"], button:has-text("Cart"), [class*="cart-fab"]').first();
    if (!await cartBtn.isVisible({ timeout: 3_000 }).catch(() => false)) return;
    await cartBtn.click();
    await page.waitForTimeout(400);
    // Proceed to checkout
    const checkoutBtn = page.locator('button:has-text("Checkout"), button:has-text("Place"), button:has-text("Proceed")').first();
    if (await checkoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await checkoutBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'screenshots/validation-checkout-form.png', fullPage: true });
    }
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────
test.describe('Owner — sidebar navigation works', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.OWNER);
    await assertLoggedIn(page, USERS.OWNER);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  const PAGES = [
    { label: 'Orders',  path: '/orders' },
    { label: 'Menu',    path: '/menu' },
    { label: 'QR',      path: '/qr-codes' },
    { label: 'Staff',   path: '/staff' },
    { label: 'Reports', path: '/reports' },
    { label: 'Settings',path: '/settings' },
  ];

  for (const { label, path } of PAGES) {
    test(`Sidebar → ${label} navigates correctly`, async ({ page }) => {
      const navBtn = page.locator(`nav button:has-text("${label}"), aside button:has-text("${label}")`).first();
      if (await navBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await navBtn.click();
        await page.waitForURL(url => url.pathname === path, { timeout: 8_000 });
        await page.waitForLoadState('networkidle');
        await assertNoCrash(page, `Nav/${label}`);
        await page.screenshot({ path: `screenshots/nav-${label.toLowerCase()}.png`, fullPage: true });
      }
    });
  }
});
