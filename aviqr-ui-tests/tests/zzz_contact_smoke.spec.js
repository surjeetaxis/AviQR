import { test, expect } from '@playwright/test';
import { loginAs, USERS } from './helpers.js';

test('Contact Info toggle renders phone/address/website in preview', async ({ page }) => {
  await loginAs(page, USERS.OWNER);
  await page.goto('/qr-codes');
  await page.waitForLoadState('networkidle');
  await page.click('text=Print Designer');
  await page.waitForTimeout(1500);

  // Toggle Contact Info on
  await page.locator('text=Contact Info').scrollIntoViewIfNeeded();
  const row = page.locator('.qrd-extra-block', { hasText: 'Contact Info' });
  await row.locator('.qrd-toggle').click();
  await page.waitForTimeout(300);

  await row.locator('input[placeholder*="+91"]').fill('+91 98765 43210');
  await row.locator('input[placeholder*="Bengaluru"]').fill('MG Road, Bengaluru');
  await row.locator('input[placeholder*="restaurant.com"]').fill('spiceroute.in');
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'screenshots/smoke-contact-info-designer.png', fullPage: true });

  const preview = page.locator('.qrd-preview-canvas');
  await expect(preview).toContainText('+91 98765 43210');
  await expect(preview).toContainText('MG Road, Bengaluru');
  await expect(preview).toContainText('spiceroute.in');
});
