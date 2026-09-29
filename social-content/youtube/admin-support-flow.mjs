// REAL production platform admin + support session (admin@aviqr.com, Priya Mehta,
// Super Administrator). STRICTLY read-only, and deliberately stays on aggregate/overview
// pages only — this account can see every real tenant on the platform, so it never opens
// Users, Payments, Billing, Leads, Permissions, Impersonation or Audit Logs, which could
// show other businesses' individual customer/financial data.
import { record, finish } from './lib.mjs';

const nav = async (page, h, label) => {
  await h.click(page.locator(`aside button:has-text("${label}")`).first());
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(1800);
};

const meta = {
  title: 'Inside the AviQR platform — admin & support consoles (real platform data)',
  subtitle: 'How AviQR staff see the whole platform, aggregated and anonymised',
  description:
    'A look at the two consoles behind AviQR itself: the platform admin dashboard (every shop, hotel and mall on the platform, in aggregate) and the support console (ticket queue, platform health). This video only shows aggregate numbers and business names — never individual customer data.\nNames/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'SaaS admin dashboard', 'platform admin', 'support console', 'restaurant SaaS', 'India'],
};

const rec = await record('11-admin-support-flow', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'admin@aviqr.com', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/admin'), { timeout: 15000 }).catch(() => {});
  await h.sleep(1800);
  h.begin();

  h.chapter('Platform overview');
  await h.say('The platform admin console: every shop, hotel and mall, in one place', 4500);
  await h.sleep(1500);

  h.chapter('Every business on the platform');
  await nav(page, h, 'Shops');
  await h.say('Every shop on AviQR — plan, status and when it joined', 4500);

  h.chapter('Platform reports');
  await nav(page, h, 'Reports');
  await h.say('Platform-wide revenue, order mix and top shops — all aggregated', 4500);

  h.chapter('Support console');
  await h.goto('https://aviqr.com/support');
  await h.say('The same team’s support console: real-time platform health', 4500);
  await h.sleep(1500);

  h.chapter('Ticket queue');
  await nav(page, h, 'Support Tickets');
  await h.say('Support tickets across every tenant, triaged by urgency', 4500);
  await h.sleep(2000);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
