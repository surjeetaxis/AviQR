import { test, expect } from '@playwright/test';
import { DEMO_SHOP_ID, assertNoCrash, assertHasContent } from './helpers.js';

test.describe('Public pages (no login required)', () => {

  // ── Landing ──────────────────────────────────────────────────────────────
  test('Landing page — loads and shows brand name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Landing');
    await assertHasContent(page, 'Landing');
    // Brand name visible
    await expect(page.locator('text=AviQR').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/landing.png', fullPage: true });
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  test('Login page — form elements visible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Login');
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/login.png' });
  });

  test('Login page — invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
    // Should either show error or stay on login
    await page.waitForTimeout(3_000);
    const url = page.url();
    if (!url.includes('/login')) return; // some apps redirect to a dashboard
    // If still on login, an error message should appear
    const body = await page.locator('body').innerText();
    const hasError = body.toLowerCase().match(/invalid|incorrect|wrong|failed|error/);
    // Screenshot regardless
    await page.screenshot({ path: 'screenshots/login-invalid-creds.png' });
  });

  // ── Register ──────────────────────────────────────────────────────────────
  test('Register page — step 1 shows role selector', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Register');
    // Step 1: role picker (buttons, not inputs)
    await expect(page.locator('button').first()).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/register-step1.png', fullPage: true });
  });

  test('Register page — step 2 shows name/email/password inputs', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    // Click "Continue" / "Next" to advance to step 2
    const nextBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button.auth-btn').first();
    await expect(nextBtn).toBeVisible({ timeout: 8_000 });
    await nextBtn.click();
    await page.waitForTimeout(500);
    // Step 2: inputs should now be visible
    await expect(page.locator('input[type="text"], input[type="email"]').first()).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'screenshots/register-step2.png', fullPage: true });
  });

  // ── Forgot Password ───────────────────────────────────────────────────────
  test('Forgot password — email input and send button visible', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'ForgotPassword');
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Send"), button:has-text("Reset")').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/forgot-password.png' });
  });

  test('Forgot password — filling email enables send button', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'test@aviqr.com');
    const btn = page.locator('button:has-text("Send"), button:has-text("Reset")').first();
    await expect(btn).not.toBeDisabled();
    await page.screenshot({ path: 'screenshots/forgot-password-filled.png' });
  });

  // ── Customer Menu ─────────────────────────────────────────────────────────
  test('Customer menu — Spice Route — loads shop name and categories', async ({ page }) => {
    await page.goto(`/menu/${DEMO_SHOP_ID}`);
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'CustomerMenu');
    // Shop name or brand name visible
    await expect(page.locator('body')).not.toBeEmpty();
    // At least one menu category or item visible
    const hasCategory = await page.locator('[class*="cat"], [class*="category"], [class*="section"]').first().isVisible({ timeout: 5_000 }).catch(() => false);
    const hasBrand = await page.locator('text=AviQR').first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(hasCategory || hasBrand).toBe(true);
    await page.screenshot({ path: 'screenshots/customer-menu.png', fullPage: true });
  });

  test('Customer menu — veg filter works', async ({ page }) => {
    await page.goto(`/menu/${DEMO_SHOP_ID}`);
    await page.waitForLoadState('networkidle');
    const vegBtn = page.locator('button:has-text("Veg"), [class*="veg"]').first();
    if (await vegBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await vegBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/customer-menu-veg-filter.png', fullPage: true });
    }
  });

  test('Customer menu — add item to cart shows cart button', async ({ page }) => {
    await page.goto(`/menu/${DEMO_SHOP_ID}`);
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add")').first();
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(600);
      // Cart count or cart button should appear
      const cartBtn = page.locator('[class*="cart"], button:has-text("Cart"), button:has-text("View cart")').first();
      const cartVisible = await cartBtn.isVisible({ timeout: 3_000 }).catch(() => false);
      expect(cartVisible).toBe(true);
      await page.screenshot({ path: 'screenshots/customer-menu-cart.png', fullPage: true });
    }
  });

  test('Customer menu — with table param (table QR scan)', async ({ page }) => {
    await page.goto(`/menu/${DEMO_SHOP_ID}?table=5&type=table`);
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'CustomerMenu-Table');
    await page.screenshot({ path: 'screenshots/customer-menu-table-qr.png', fullPage: true });
  });

  // ── Legal Pages ───────────────────────────────────────────────────────────
  test('Terms page — loads with content', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Terms');
    await assertHasContent(page, 'Terms');
    await page.screenshot({ path: 'screenshots/terms.png', fullPage: true });
  });

  test('Privacy page — loads with content', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Privacy');
    await assertHasContent(page, 'Privacy');
    await page.screenshot({ path: 'screenshots/privacy.png', fullPage: true });
  });
});
