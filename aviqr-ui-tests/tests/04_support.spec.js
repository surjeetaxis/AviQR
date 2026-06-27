import { test, expect } from '@playwright/test';
import { loginAs, assertLoggedIn, assertNoCrash, assertDataLoaded, goToTab, USERS } from './helpers.js';

test.describe('Support Agent — login + all tabs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USERS.SUPPORT);
    await assertLoggedIn(page, USERS.SUPPORT);
    await page.waitForURL(url => url.pathname.startsWith('/support'), { timeout: 10_000 })
      .catch(() => page.goto('/support'));
    await page.waitForLoadState('networkidle');
  });

  test('Support — overview shows key KPIs', async ({ page }) => {
    await assertNoCrash(page, 'Support/Overview');
    await assertDataLoaded(page, 'Support/Overview');
    const kpi = page.locator('[class*="kpi"], [class*="stat"], [class*="card"]').first();
    await expect(kpi).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: 'screenshots/support-overview.png', fullPage: true });
  });

  test('Support — Tickets tab loads ticket list', async ({ page }) => {
    await goToTab(page, 'Tickets');
    await assertNoCrash(page, 'Support/Tickets');
    await assertDataLoaded(page, 'Support/Tickets');
    // Ticket rows or empty state
    const ticketEl = page.locator('.ticket-row, [class*="ticket-row"]').first();
    const emptyEl  = page.locator('.support-empty, [class*="empty"]').first();
    const hasTickets = await ticketEl.isVisible({ timeout: 6_000 }).catch(() => false);
    const hasEmpty   = await emptyEl.isVisible({ timeout: 2_000 }).catch(() => false);
    expect(hasTickets || hasEmpty).toBe(true);
    await page.screenshot({ path: 'screenshots/support-tickets.png', fullPage: true });
  });

  test('Support — Tickets — filter by priority', async ({ page }) => {
    await goToTab(page, 'Tickets');
    await page.waitForLoadState('networkidle');
    const urgentBtn = page.locator('button:has-text("Urgent"), button:has-text("High"), [class*="filter"]').first();
    if (await urgentBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await urgentBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/support-tickets-filtered.png', fullPage: true });
    }
  });

  test('Support — Orders tab', async ({ page }) => {
    await goToTab(page, 'Orders');
    await assertNoCrash(page, 'Support/Orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/support-orders.png', fullPage: true });
  });

  test('Support — Payments tab', async ({ page }) => {
    await goToTab(page, 'Payments');
    await assertNoCrash(page, 'Support/Payments');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/support-payments.png', fullPage: true });
  });

  test('Support — Users tab loads user list', async ({ page }) => {
    await goToTab(page, 'Users');
    await assertNoCrash(page, 'Support/Users');
    await assertDataLoaded(page, 'Support/Users');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/support-users.png', fullPage: true });
  });

  test('Support — logout works', async ({ page }) => {
    const logoutBtn = page.locator('button:has-text("Sign out"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await logoutBtn.click();
      await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login', { timeout: 8_000 });
      await page.screenshot({ path: 'screenshots/support-after-logout.png' });
    }
  });
});
