// REAL production mall admin session (admin@forum.in, Forum Mall Bengaluru).
// Toggles a real vendor active (safe, reversible), then tours orders/revenue/reports.
import { record, finish } from './lib.mjs';

const nav = async (page, h, label) => {
  await h.click(page.locator(`aside button:has-text("${label}")`).first());
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(1800);
};

const meta = {
  title: 'AviQR for mall food courts — every vendor, one dashboard (Forum Mall)',
  subtitle: 'Vendors, orders, revenue share and reports for a whole food court',
  description:
    'A real mall admin session on a live AviQR food court (Forum Mall Bengaluru): the overview, managing a real vendor’s status, then a tour of orders across every vendor, revenue share and reports.\nNames/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'mall food court', 'food court management', 'vendor management', 'revenue share', 'India'],
};

const rec = await record('09-mall-flow', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'admin@forum.in', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/mall'), { timeout: 15000 }).catch(() => {});
  await h.sleep(1800);
  h.begin();

  h.chapter('Food court overview');
  await h.say('Forum Mall Bengaluru: every vendor, one dashboard', 4500);
  await h.sleep(1500);

  h.chapter('Manage a real vendor');
  await nav(page, h, 'Vendors');
  await h.say('Every vendor’s status and QR link, in one table', 4000);
  const inactiveRow = page.locator('tr', { hasText: 'inactive' }).first();
  const toggleBtn = inactiveRow.locator('button').nth(1);
  if (await toggleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await h.click(toggleBtn);
    await h.say('Switching a vendor back to active', 4000);
    await h.sleep(1200);
  }

  h.chapter('Orders across every vendor');
  await nav(page, h, 'All Orders');
  await h.say('Every vendor’s orders in one live feed', 4000);

  h.chapter('Revenue share');
  await nav(page, h, 'Revenue Share');
  await h.say('Revenue share, calculated automatically per vendor', 4500);

  h.chapter('Reports');
  await nav(page, h, 'Reports');
  await h.say('Reports: GMV, commission earned and per-vendor performance', 4500);
  await h.sleep(2000);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
