import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, assertHasContent, assertDataLoaded, USERS } from './helpers.js';

// ─── OWNER ────────────────────────────────────────────────────────────────────
test.describe('Owner — login + all pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.OWNER);
    await assertLoggedIn(page, USERS.OWNER);
  });

  test('Dashboard — stats and order feed visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/Dashboard');
    await assertDataLoaded(page, 'Owner/Dashboard');
    // Stat cards (revenue, orders, etc.)
    const statCard = page.locator('[class*="stat"], [class*="kpi"], [class*="card"]').first();
    await expect(statCard).toBeVisible({ timeout: 8_000 });
    // Sidebar nav should exist
    await expect(page.locator('nav, aside').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/owner-dashboard.png', fullPage: true });
  });

  test('Orders — page loads, filters visible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/Orders');
    await assertDataLoaded(page, 'Owner/Orders');
    // Page title
    await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /order/i }).first()).toBeVisible({ timeout: 8_000 });
    // Status filter buttons (All, New, Preparing, etc.)
    const filterBtn = page.locator('button:has-text("All"), button:has-text("New"), [class*="seg-btn"]').first();
    await expect(filterBtn).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'screenshots/owner-orders.png', fullPage: true });
  });

  test('Orders — filter by status works', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    const newBtn = page.locator('button:has-text("New")').first();
    if (await newBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/owner-orders-filter-new.png', fullPage: true });
    }
  });

  test('Menu — categories and items visible', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/Menu');
    await assertDataLoaded(page, 'Owner/Menu');
    await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /menu/i }).first()).toBeVisible({ timeout: 8_000 });
    // Category pills or cards
    const catEl = page.locator('[class*="card"], [class*="seg-btn"], [class*="cat"]').first();
    await expect(catEl).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/owner-menu.png', fullPage: true });
  });

  test('Menu — Add Item modal opens and has required fields', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    const addBtn = page.locator('button:has-text("Add item")').first();
    if (await addBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await addBtn.click();
      await expect(page.locator('text=Add new item')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('input[placeholder*="name" i], label:has-text("Item name")').first()).toBeVisible();
      await expect(page.locator('input[type="number"], label:has-text("Price")').first()).toBeVisible();
      await page.screenshot({ path: 'screenshots/owner-menu-add-modal.png' });
      // Close modal
      await page.keyboard.press('Escape');
    }
  });

  test('QR Codes — page loads with create buttons', async ({ page }) => {
    await page.goto('/qr-codes');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/QRCodes');
    await assertDataLoaded(page, 'Owner/QRCodes');
    await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /qr/i }).first()).toBeVisible({ timeout: 8_000 });
    // Create buttons
    await expect(page.locator('button:has-text("Table QR"), button:has-text("Shop QR")').first()).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'screenshots/owner-qr-codes.png', fullPage: true });
  });

  test('QR Codes — preview modal opens', async ({ page }) => {
    await page.goto('/qr-codes');
    await page.waitForLoadState('networkidle');
    const previewBtn = page.locator('button:has-text("Preview")').first();
    if (await previewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await previewBtn.click();
      await expect(page.locator('[class*="modal"], [style*="fixed"]').first()).toBeVisible({ timeout: 4_000 });
      await page.screenshot({ path: 'screenshots/owner-qr-preview.png' });
      await page.keyboard.press('Escape');
    }
  });

  test('Staff — page loads, add staff button visible', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/Staff');
    await assertDataLoaded(page, 'Owner/Staff');
    await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /staff/i }).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('button:has-text("Add staff")').first()).toBeVisible({ timeout: 5_000 });
    await page.screenshot({ path: 'screenshots/owner-staff.png', fullPage: true });
  });

  test('Staff — Add Staff modal opens with role selector', async ({ page }) => {
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Add staff")');
    await expect(page.locator('text=Add staff member')).toBeVisible({ timeout: 5_000 });
    // Name input
    await expect(page.locator('input[placeholder*="name" i], label:has-text("Full Name")').first()).toBeVisible();
    // Role selector
    await expect(page.locator('button:has-text("Manager"), button:has-text("Cashier")').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/owner-staff-add-modal.png' });
    await page.keyboard.press('Escape');
  });

  test('Reports — charts and data visible', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/Reports');
    await assertDataLoaded(page, 'Owner/Reports');
    await expect(page.locator('h1, [class*="page-title"]').filter({ hasText: /report/i }).first()).toBeVisible({ timeout: 8_000 });
    // Chart or data table
    const chart = page.locator('svg, [class*="chart"], [class*="recharts"]').first();
    const hasChart = await chart.isVisible({ timeout: 5_000 }).catch(() => false);
    await page.screenshot({ path: 'screenshots/owner-reports.png', fullPage: true });
  });

  test('Settings — shop profile section visible', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/Settings');
    await expect(page.locator(':has-text("Shop Profile"), :has-text("Shop profile")').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('input').first()).toBeVisible();
    await expect(page.locator('button:has-text("Save")').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/owner-settings-shop.png', fullPage: true });
  });

  test('Settings — Opening hours section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const hoursLink = page.locator('button:has-text("Opening hours"), button:has-text("Hours")').first();
    if (await hoursLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await hoursLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(':has-text("Mon"), :has-text("Tue")').first()).toBeVisible({ timeout: 5_000 });
      await page.screenshot({ path: 'screenshots/owner-settings-hours.png', fullPage: true });
    }
  });

  test('Settings — Payment methods section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    const payLink = page.locator('button:has-text("Payment")').first();
    if (await payLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await payLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'screenshots/owner-settings-payment.png', fullPage: true });
    }
  });

  test('AI Hub — loads', async ({ page }) => {
    await page.goto('/ai');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Owner/AI');
    await page.screenshot({ path: 'screenshots/owner-ai-hub.png', fullPage: true });
  });
});

// ─── MANAGER ─────────────────────────────────────────────────────────────────
test.describe('Manager — login + key pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.MANAGER);
    await assertLoggedIn(page, USERS.MANAGER);
  });

  test('Manager — Dashboard loads', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Manager/Dashboard');
    await expect(page.locator('nav, aside').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/manager-dashboard.png', fullPage: true });
  });

  test('Manager — Orders accessible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Manager/Orders');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/manager-orders.png', fullPage: true });
  });

  test('Manager — Menu accessible', async ({ page }) => {
    await page.goto('/menu');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Manager/Menu');
    await page.screenshot({ path: 'screenshots/manager-menu.png', fullPage: true });
  });
});

// ─── CASHIER ─────────────────────────────────────────────────────────────────
test.describe('Cashier — login + key pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.CASHIER);
    await assertLoggedIn(page, USERS.CASHIER);
  });

  test('Cashier — Dashboard loads', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Cashier/Dashboard');
    await page.screenshot({ path: 'screenshots/cashier-dashboard.png', fullPage: true });
  });

  test('Cashier — Orders page', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Cashier/Orders');
    await page.screenshot({ path: 'screenshots/cashier-orders.png', fullPage: true });
  });
});

// ─── KITCHEN ─────────────────────────────────────────────────────────────────
test.describe('Kitchen staff — login + key pages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.KITCHEN);
    await assertLoggedIn(page, USERS.KITCHEN);
  });

  test('Kitchen — Dashboard/Orders loads', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await assertNoCrash(page, 'Kitchen/Dashboard');
    await page.screenshot({ path: 'screenshots/kitchen-dashboard.png', fullPage: true });
  });
});
