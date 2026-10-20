// Save a logged-in aviqr.com session per demo role, for recording dashboard Shorts.
//
// Opens a normal (visible) Chrome window at aviqr.com/login. You sign in yourself; the script never sees or
// types a password. Once the dashboard has loaded, close the window (or wait: it saves as soon as the URL
// leaves /login) and the session is stored in shorts/out/sessions/<role>.json (git-ignored).
//
// Usage (from social-content/):
//   node shorts/login.mjs owner           # one role
//   node shorts/login.mjs                 # every role in ROLES, one window after another
//   node shorts/login.mjs --check         # which saved sessions still open the dashboard
import { chromium } from '../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'out', 'sessions');

// Demo accounts from aviqr-backend's seed SQL (dummy data). Email shown as a hint only.
export const ROLES = {
  owner: 'sujeet@spiceroute.in',
  cashier: 'cashier@spiceroute.in',
  kitchen: 'kitchen@spiceroute.in',
  manager: 'vikram@gmail.com',
  'menu-editor': 'menu@cakestudio.in',
  'order-viewer': 'anoop@coconut.in',
  hotel: 'gm@grandpalace.in',
  mall: 'admin@forum.in',
  supplier: 'ramesh@teas.in',
  admin: 'admin@aviqr.com',
  support: 'support@aviqr.com',
  customer: 'anjali@gmail.com',
};

async function save(role) {
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  await page.goto('https://aviqr.com/login');
  await page.evaluate(([r, e]) => {
    const b = document.createElement('div');
    b.textContent = `Recorder session for "${r}" — sign in as ${e}`;
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#0F6E56;color:#fff;font:600 15px sans-serif;padding:8px;text-align:center';
    document.body.appendChild(b);
  }, [role, ROLES[role]]);
  console.log(`[${role}] sign in as ${ROLES[role]} in the Chrome window…`);
  await page.waitForURL(u => !/\/(login|register)/.test(u.pathname), { timeout: 10 * 60e3 });
  await page.waitForLoadState('networkidle').catch(() => {});
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${role}.json`);
  await ctx.storageState({ path: file });
  fs.chmodSync(file, 0o600);
  console.log(`[${role}] saved ${path.relative(HERE, file)} (landed on ${new URL(page.url()).pathname})`);
  await browser.close();
}

async function check() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const role of Object.keys(ROLES)) {
    const file = path.join(DIR, `${role}.json`);
    if (!fs.existsSync(file)) { console.log(`${role.padEnd(13)} missing`); continue; }
    const ctx = await browser.newContext({ storageState: file });
    const page = await ctx.newPage();
    await page.goto('https://aviqr.com/dashboard', { waitUntil: 'networkidle' }).catch(() => {});
    console.log(`${role.padEnd(13)} ${/\/login/.test(page.url()) ? 'EXPIRED' : 'ok  ' + new URL(page.url()).pathname}`);
    await ctx.close();
  }
  await browser.close();
}

const args = process.argv.slice(2);
if (args.includes('--check')) await check();
else for (const role of args.length ? args : Object.keys(ROLES)) {
  if (!ROLES[role]) { console.error(`unknown role ${role}; one of: ${Object.keys(ROLES).join(', ')}`); process.exit(1); }
  await save(role);
}
