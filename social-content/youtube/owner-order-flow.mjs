// REAL production owner session (sujeet@spiceroute.in, Spice Route). Processes the real
// order placed by 06-customer-order-flow.mjs end to end, then tours the rest of the
// owner dashboard. No destructive actions on any order/data that isn't ours.
import { record, finish } from './lib.mjs';

const ORDER_SEARCH = process.env.AQ_ORDER_SEARCH; // last digits of the order id to find
if (!ORDER_SEARCH) { console.error('Set AQ_ORDER_SEARCH'); process.exit(1); }

const meta = {
  title: 'A real order, start to finish — AviQR owner dashboard (Spice Route)',
  subtitle: 'Accept → kitchen → ready → delivered, then a tour of the owner tools',
  description:
    'The other half of the QR-ordering flow: logging in as the restaurant owner on a live AviQR shop (Spice Route), accepting the real order a customer just placed, moving it through the kitchen queue, marking it delivered, then a quick tour of menu, inventory, loyalty and reports. Names/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'restaurant dashboard', 'restaurant POS', 'KOT', 'restaurant management software', 'India'],
};

const nav = async (page, h, label) => {
  await h.click(page.locator(`aside a:has-text("${label}"), nav a:has-text("${label}")`).first());
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(1800); // give client-side data fetches (menu items, dashboard cards) time to land
};

const rec = await record('07-owner-order-flow', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'sujeet@spiceroute.in', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/dashboard'), { timeout: 15000 }).catch(() => {});
  await h.sleep(1500);
  h.begin();

  h.chapter('Owner dashboard');
  await h.say('Logging in to the owner dashboard for Spice Route', 4000);
  await h.sleep(1500);

  h.chapter('A new order arrives');
  await nav(page, h, 'Orders');
  await h.say('A customer just placed a real order — cash at counter', 4000);
  const search = page.getByPlaceholder(/search order/i);
  await h.type(search, ORDER_SEARCH, 60);
  await h.sleep(1000);

  h.chapter('Accept the order');
  const acceptBtn = page.getByRole('button', { name: /accept order/i }).first();
  await h.click(acceptBtn);
  await h.say('Accepting the order', 3000);
  await h.sleep(1200);

  h.chapter('Kitchen');
  const cookBtn = page.getByRole('button', { name: /start cooking/i }).first();
  if (await cookBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await h.click(cookBtn);
    await h.say('Sending it to the kitchen', 3000);
    await h.sleep(1200);
  }
  await nav(page, h, 'Kitchen Display');
  await h.say('Kitchen Display (KOT): the order the kitchen actually sees', 4500);
  await h.sleep(1500);

  h.chapter('Ready & delivered');
  await nav(page, h, 'Orders');
  await h.type(search, ORDER_SEARCH, 60);
  await h.sleep(800);
  const readyBtn = page.getByRole('button', { name: /mark ready/i }).first();
  if (await readyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await h.click(readyBtn);
    await h.say('Marking it ready', 3000);
    await h.sleep(1200);
  }
  const deliveredBtn = page.getByRole('button', { name: /mark delivered/i }).first();
  if (await deliveredBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await h.click(deliveredBtn);
    await h.say('Marking it delivered — order complete', 4000);
    await h.sleep(1500);
  }

  h.chapter('Revenue updates live');
  await nav(page, h, 'Dashboard');
  await h.say('Back on the dashboard: today’s revenue and completed orders just updated', 4500);
  await h.sleep(1500);

  h.chapter('Menu & inventory');
  await nav(page, h, 'Menu Items');
  await page.getByText(/items across/i).waitFor({ timeout: 8000 }).catch(() => {});
  await h.say('Menu items: prices, photos and availability, all live', 4000);
  await nav(page, h, 'Stock Levels');
  await h.say('Stock levels, with low-stock alerts', 3500);

  h.chapter('Loyalty & reports');
  await nav(page, h, 'Loyalty Program');
  await h.say('Loyalty & CRM: points, tiers and repeat customers', 4000);
  await nav(page, h, 'Reports');
  await h.say('Reports: revenue trends, peak hours and top items', 4000);

  h.chapter('AI Hub');
  await nav(page, h, 'AI Features');
  await h.say('The AI Hub: 11 tools, including an admin assistant powered by Claude', 5000);
  await h.sleep(2000);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
