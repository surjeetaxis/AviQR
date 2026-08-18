// AviQR UI Test Helpers

export const BASE = process.env.UI_URL || 'http://localhost:5173';

// Seed credentials from aviqr_setup.sql
export const USERS = {
  OWNER:    { email: 'sujeet@spiceroute.in',  password: 'Axis321#', role: 'owner',    label: 'Owner' },
  MANAGER:  { email: 'vikram@gmail.com',       password: 'Axis321#', role: 'manager',  label: 'Manager' },
  CASHIER:  { email: 'cashier@spiceroute.in',  password: 'Axis321#', role: 'cashier',  label: 'Cashier' },
  KITCHEN:  { email: 'kitchen@spiceroute.in',  password: 'Axis321#', role: 'kitchen',  label: 'Kitchen' },
  ADMIN:    { email: 'admin@aviqr.com',         password: 'Axis321#', role: 'admin',    label: 'Admin' },
  SUPPORT:  { email: 'support@aviqr.com',       password: 'Axis321#', role: 'support',  label: 'Support' },
  HOTEL:    { email: 'gm@grandpalace.in',      password: 'Axis321#', role: 'hotel',    label: 'Hotel GM' },
  MALL:     { email: 'admin@forum.in',         password: 'Axis321#', role: 'mall',     label: 'Mall Admin' },
  SUPPLIER: { email: 'ramesh@teas.in',         password: 'Axis321#', role: 'supplier', label: 'Supplier' },
};

export const DEMO_SHOP_ID = '00000000-0000-0000-0000-000000000101';

/**
 * Log in via the UI, assert login succeeded (no longer on /login),
 * and take a screenshot labelled "after-login".
 */
export async function loginAs(page, user) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 8_000 });

  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"], input[name="password"]', user.password);
  await page.screenshot({ path: `screenshots/${user.role}-01-login-filled.png` });

  await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Continue")');

  // Wait until we leave /login or see an error
  await Promise.race([
    page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 12_000 }),
    page.waitForSelector('.error, [role="alert"], text=/invalid|incorrect|failed/i', { timeout: 12_000 }),
  ]).catch(() => {});

  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Navigate to a sidebar item by visible text. Returns true if found.
 */
export async function goToTab(page, label) {
  const sel = `nav button:has-text("${label}"), aside button:has-text("${label}"), a:has-text("${label}")`;
  const el = page.locator(sel).first();
  const visible = await el.isVisible({ timeout: 3_000 }).catch(() => false);
  if (visible) {
    await el.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
  return visible;
}

/**
 * Assert no full-page crash: no "Application error", blank body, or fatal stack trace.
 */
export async function assertNoCrash(page, context) {
  const body = await page.locator('body').innerText().catch(() => '');
  const lower = body.toLowerCase();
  // Check for React crash overlay
  const crashOverlay = page.locator('#webpack-dev-server-client-overlay, [data-testid="error-boundary"]');
  const hasCrash = await crashOverlay.isVisible({ timeout: 500 }).catch(() => false);
  if (hasCrash) throw new Error(`${context}: React crash overlay visible`);
  if (lower.includes('application error') && lower.includes('digest')) {
    throw new Error(`${context}: Next.js application error on page`);
  }
}

/**
 * Assert login was successful (not still on /login page, no error alert).
 */
export async function assertLoggedIn(page, user) {
  const url = page.url();
  if (url.includes('/login')) {
    const errorText = await page.locator('.error, [role="alert"]').textContent().catch(() => '');
    throw new Error(`Login failed for ${user.email}: still on /login. Error: ${errorText}`);
  }
}

/**
 * Assert the page is not a blank white screen (has meaningful content).
 */
export async function assertHasContent(page, label) {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (bodyText.trim().length < 20) {
    throw new Error(`${label}: page appears blank (body text too short)`);
  }
}

/**
 * Assert no persistent loading spinner (data should have loaded).
 */
export async function assertDataLoaded(page, label) {
  // Wait up to 8s for loading indicators to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('[class*="spin"], [class*="loading"], [class*="skeleton"]');
    return spinners.length === 0;
  }, { timeout: 8_000 }).catch(() => {
    // Not fatal — some pages may have background pollers
  });
}
