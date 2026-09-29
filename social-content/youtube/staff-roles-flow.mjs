// REAL production owner session (sujeet@spiceroute.in). Tours the Staff page and the
// "Add staff member" role picker for all 5 role types, showing each role's scoped
// sidebar/features. Deliberately never types a phone/email or submits the form —
// creating a real staff login is a separate, explicitly-gated action.
import { record, finish } from './lib.mjs';

const meta = {
  title: 'AviQR staff roles — Manager, Cashier, Kitchen, Menu Editor, Order Viewer',
  subtitle: 'One shop, five scoped logins — what each role can and can’t see',
  description:
    'A real look at AviQR’s staff roles on a live shop (Spice Route): Manager, Cashier, Kitchen Staff, Menu Editor and Order Viewer each get a login scoped to only the tools their job needs — shown here via the owner’s "Add staff" screen.\nNames/numbers shown belong to the account used to record this video.',
  tags: ['AviQR', 'restaurant staff roles', 'restaurant permissions', 'POS roles', 'restaurant management software', 'India'],
};

const rec = await record('12-staff-roles-flow', async (page, h) => {
  await h.goto('https://aviqr.com/login');
  await h.type(page.getByPlaceholder('you@restaurant.in'), 'sujeet@spiceroute.in', 45);
  await h.type(page.getByPlaceholder('Min 8 characters'), 'Axis321#', 45);
  await h.click(page.getByRole('button', { name: /sign in|log in|login/i }));
  await page.waitForURL(u => u.pathname.startsWith('/dashboard'), { timeout: 15000 }).catch(() => {});
  await h.goto('https://aviqr.com/staff');
  h.begin();

  h.chapter('One shop, several logins');
  await h.say('Spice Route already has three team members, each scoped to their job', 4500);
  await h.sleep(1500);

  h.chapter('Five role types');
  await h.click(page.getByRole('button', { name: /add staff/i }));
  await h.sleep(1000);
  await h.say('Every new team member gets one of five roles', 4000);

  const roles = [
    ['Manager', 'Manager: everything except billing plan & account settings'],
    ['Cashier', 'Cashier: dashboard, orders, POS billing, reports'],
    ['Kitchen Staff', 'Kitchen Staff: just the live order queue'],
    ['Menu Editor', 'Menu Editor: menu items and variations only'],
    ['Order Viewer', 'Order Viewer: read-only access to orders'],
  ];
  for (const [label, caption] of roles) {
    await h.click(page.getByRole('button', { name: label, exact: true }));
    await h.say(caption, 4000);
  }

  h.chapter('Scoped from day one');
  await h.say('Each role sees a different sidebar — nothing more than their job needs', 4500);
  await h.sleep(1500);
  const cancelBtn = page.getByRole('button', { name: /cancel/i });
  if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) await h.click(cancelBtn);
  await h.sleep(1500);
});

const mp4 = await finish(rec, meta);
console.log('DONE', mp4);
