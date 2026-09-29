// Re-shoot ONLY the tail tour (Menu Items → Stock Levels → Loyalty → Reports → AI Hub)
// of 07-owner-order-flow.mp4 — the order-processing portion already recorded real order
// actions that can't be repeated (the order is now Completed). No order actions here.
import { record } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const nav = async (page, h, label) => {
  await h.click(page.locator(`aside a:has-text("${label}"), nav a:has-text("${label}")`).first());
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(1800);
};

const rec = await record('07b-owner-tail-tour', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'sujeet@spiceroute.in', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/dashboard'), { timeout: 15000 }).catch(() => {});
  await h.sleep(1800);
  h.begin();

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

fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'out', 'tail-rec.json'), JSON.stringify(rec, null, 2));
console.log('TAIL_WEBM', rec.webm);
console.log('TAIL_TRIM', rec.trim);
console.log('TAIL_DUR', rec.durationSec);
