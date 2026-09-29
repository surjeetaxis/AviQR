// REAL production hotel GM session (gm@grandpalace.in, Grand Palace Hotel, Chennai).
// Accepts + completes one real guest request, then tours front-desk/housekeeping/reports.
import { record, finish } from './lib.mjs';

const nav = async (page, h, label) => {
  await h.click(page.locator(`aside button:has-text("${label}")`).first());
  await page.waitForLoadState('networkidle').catch(() => {});
  await h.sleep(1800);
};

const meta = {
  title: 'AviQR for hotels — front desk, guest requests & housekeeping (Grand Palace Hotel)',
  subtitle: 'One QR code, one login: rooms, guest requests, housekeeping, reports',
  description:
    'A real hotel front-desk session on a live AviQR property (Grand Palace Hotel, Chennai): the overview dashboard, accepting and completing a real guest request end to end, then a tour of housekeeping, reservations and reports.\nNames/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'hotel PMS', 'hotel management software', 'guest requests', 'housekeeping software', 'hotel front desk', 'India'],
};

const rec = await record('08-hotel-flow', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'gm@grandpalace.in', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/hotel'), { timeout: 15000 }).catch(() => {});
  await h.sleep(1500);

  // Switch to the property that actually has data — the GM account has 5 demo properties.
  await h.click(page.locator('aside button').first());
  await h.sleep(600);
  await h.click(page.locator('aside button:has-text("Chennai")').first());
  await h.sleep(1800);
  h.begin();

  h.chapter('Hotel overview');
  await h.say('Grand Palace Hotel: one login for the whole front desk', 4500);
  await h.sleep(1500);

  h.chapter('A real guest request');
  await nav(page, h, 'Guest Requests');
  await h.say('Guest requests come in live from every room’s QR code', 4000);
  const acceptBtn = page.getByRole('button', { name: 'Accept' }).first();
  await h.click(acceptBtn);
  await h.say('Accepting a real request', 3500);
  await h.sleep(1200);
  const doneBtn = page.getByRole('button', { name: 'Mark done' }).first();
  await h.click(doneBtn);
  await h.say('Marking it done — request closed', 3500);
  await h.sleep(1500);

  h.chapter('Housekeeping');
  await nav(page, h, 'Housekeeping');
  await h.say('Housekeeping: room status across the whole property', 4000);

  h.chapter('Reservations');
  await nav(page, h, 'Reservations');
  await h.say('Reservations: every booking, one screen', 4000);
  await nav(page, h, 'Booking Calendar');
  await h.say('The booking calendar, room by room', 3500);

  h.chapter('Reports');
  await nav(page, h, 'Reports');
  await h.say('Reports: occupancy, ADR, RevPAR and revenue trends', 4500);
  await h.sleep(2000);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
