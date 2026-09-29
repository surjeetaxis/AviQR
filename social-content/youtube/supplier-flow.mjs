// REAL production supplier/multi-outlet session (ramesh@teas.in, Ramesh Enterprises).
// Read-only tour — no changes made to any outlet's data.
import { record, finish } from './lib.mjs';

const nav = async (page, h, label) => {
  await h.click(page.locator(`aside button:has-text("${label}")`).first());
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(1800);
};

const meta = {
  title: 'AviQR for multi-outlet brands — every outlet, one login (Ramesh Tea House)',
  subtitle: 'Menu sync, orders and reports across every outlet of a brand',
  description:
    'A real multi-outlet supplier session on a live AviQR brand (Ramesh Tea House, 4 outlets): the brand overview, individual outlets, menu sync across locations, orders and reports — all from one login.\nNames/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'multi-outlet restaurant software', 'restaurant chain management', 'menu sync', 'franchise software', 'India'],
};

const rec = await record('10-supplier-flow', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'ramesh@teas.in', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/supplier'), { timeout: 15000 }).catch(() => {});
  await h.sleep(1500);

  // Switch UI to English (account defaults to Hindi) — match by title, the
  // visible label toggles between "HI"/"EN" so text-matching it is unreliable.
  const langBtn = page.locator('[title="Change language"]').first();
  if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await h.click(langBtn);
    await h.sleep(600);
    const englishOpt = page.getByText('English', { exact: true });
    if (await englishOpt.isVisible({ timeout: 2000 }).catch(() => false)) await h.click(englishOpt);
  }
  await h.sleep(1800);
  h.begin();

  h.chapter('Brand overview');
  await h.say('Ramesh Tea House: four outlets, one login', 4500);
  await h.sleep(1500);

  h.chapter('Every outlet');
  await nav(page, h, 'Outlets');
  await h.say('Each outlet gets its own menu, staff and billing', 4500);

  h.chapter('Menu sync');
  await nav(page, h, 'Menu Sync');
  await h.say('Update a dish once, sync it to every outlet', 4500);

  h.chapter('Orders');
  await nav(page, h, 'All Orders');
  await h.say('Every outlet’s orders, in one feed', 4000);

  h.chapter('Reports');
  await nav(page, h, 'Reports');
  await h.say('Reports across the whole brand, outlet by outlet', 4500);
  await h.sleep(2000);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
