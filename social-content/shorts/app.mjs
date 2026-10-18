// Render the big Shorts set (flows.mjs) in every language.
//
// Dashboard screens come from a LOCAL AviQR stack (aviqr-backend `./aviqr.sh run all` + aviqr-ui-web
// `npm run dev` on localhost:5173) signed in with the seed accounts; public screens come from the live
// customer menu and booking-engine sites (no login, nothing submitted). Before every capture, emails,
// phone numbers, seed person names and stale elapsed-time badges are hidden.
//
// Usage (from social-content/):
//   AQ_LOCAL_PASSWORD=… node shorts/app.mjs                       # everything, every language
//   AQ_LOCAL_PASSWORD=… node shorts/app.mjs --only o-kot h-03 --lang en hi
//   AQ_LOCAL_PASSWORD=… node shorts/app.mjs --skip-existing      # resume
// AQ_LOCAL_PASSWORD is the seed password (aviqr-backend/aviqr_setup.sql); it is only sent to localhost.
//
// Output: shorts/out/videos/<flow>-<lang>.{mp4,png,json}. Translations: shorts/i18n/<lang>.json
// ({ flowId: [hook, caption1, caption2, title], _end: [title, sub, tag] }); English comes from flows.mjs.
import { chromium } from '../node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAPTION_CSS, card, encode } from './render.mjs';
import { FLOWS } from './flows.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const SHOTS = path.join(OUT, 'shots2');
const VIDEOS = path.join(OUT, 'videos');
const LOCAL = 'http://localhost:5173';
const LOCAL_API = 'http://localhost:8080';
export const LANGS = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'bn', 'mr', 'gu'];
const MENU_LANG = { en: 'English', hi: 'हिंदी', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ', ml: 'മലയാളം', bn: 'বাংলা', mr: 'मराठी', gu: 'ગુજરાતી' };
const ROLE_EMAIL = {
  owner: 'sujeet@spiceroute.in', cashier: 'cashier@spiceroute.in', kitchen: 'kitchen@spiceroute.in', manager: 'vikram@gmail.com',
  'menu-editor': 'menu@cakestudio.in', 'order-viewer': 'anoop@coconut.in', hotel: 'gm@grandpalace.in', mall: 'admin@forum.in', supplier: 'ramesh@teas.in',
};
const PHONE = { viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true, locale: 'en-IN', timezoneId: 'Asia/Kolkata' };
const HOOK_S = 2.6, SHOT_S = 5.2, END_S = 3.2;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Names to blur: every person name in the local seed data (shorts/out/mask-names.json, built with psql) plus first names.
function maskNames() {
  const file = path.join(OUT, 'mask-names.json');
  const full = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
  const keep = full.filter(n => !/order$/i.test(n));
  const firsts = keep.map(n => n.split(/\s+/)[0]).filter(n => n.length >= 4 && keep.some(k => k.includes(' ')));
  return [...new Set([...keep, ...firsts])].sort((a, b) => b.length - a.length);
}

// Runs in the page: hide personal data and stale elapsed-time badges.
function scrub(names) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const email = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
  const phone = /(\+?91[\s-]?)?\b[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\b\d{5}[\s-]\d{5}\b/g;
  const name = names.length ? new RegExp(`\\b(${names.map(esc).join('|')})\\b`, 'g') : null;
  const stale = /\b\d{2,}h\s*\d+m\b|\b\d{3,}m\b|\b\d+h\s*\d+m\s*ago\b|\b\d{2,}\s*(hours?|hrs?)\s*ago\b/i;
  const clean = t => { let s = t.replace(email, '•••••').replace(phone, '••••• •••••'); return name ? s.replace(name, '•••••') : s; };
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walk.nextNode()) nodes.push(walk.currentNode);
  for (const n of nodes) {
    if (stale.test(n.nodeValue)) { const el = n.parentElement; if (el) el.style.visibility = 'hidden'; continue; }
    const v = clean(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v;
  }
  for (const el of document.querySelectorAll('input, textarea')) { const v = clean(el.value || ''); if (v !== el.value) el.value = v; }
}

// Sign in on the local web app inside the recording context itself (a copied session's refresh token
// does not survive into a new context for every portal, and a local login takes a second).
async function signIn(page, role) {
  if (!process.env.AQ_LOCAL_PASSWORD) throw new Error('set AQ_LOCAL_PASSWORD (the seed password) to sign in locally');
  await page.goto(LOCAL + '/login', { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).first().fill(ROLE_EMAIL[role]);
  await page.getByLabel(/password/i).first().fill(process.env.AQ_LOCAL_PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(u => !u.pathname.includes('login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

const contexts = new Map(); // `${role || 'public'}|${lang}` -> page
async function pageFor(browser, role, lang) {
  const key = `${role || 'public'}|${lang}`;
  if (contexts.has(key)) return contexts.get(key);
  const ctx = await browser.newContext({ ...PHONE });
  await ctx.addInitScript(l => { try { localStorage.setItem('aviqr_lang', l); } catch {} }, lang);
  const page = await ctx.newPage();
  if (role) await signIn(page, role);
  contexts.set(key, page);
  return page;
}

async function capture(browser, screen, lang, caption, png, names) {
  const page = await pageFor(browser, screen.role, lang);
  const url = screen.url || LOCAL + screen.path;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  if (screen.role && /\/login/.test(page.url())) throw new Error(`${screen.role} is not signed in (session expired?)`);
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await sleep(700);
  if (screen.url?.includes('/menu/') && lang !== 'en' && !screen.menuLang) { // switch the customer menu's language
    await page.getByRole('button', { name: 'English' }).first().click().catch(() => {});
    await sleep(400);
    await page.getByText(MENU_LANG[lang], { exact: true }).first().click().catch(() => {});
    await sleep(1200);
  }
  if (screen.menuLang) { // open the language picker (the menu always starts in English)
    await page.getByRole('button', { name: 'English' }).first().click().catch(() => {});
    await sleep(700);
  }
  if (screen.tab) {
    // Portals render tab buttons twice (desktop + phone); click the visible one, starting with its text.
    // On phones the tabs sit in an off-screen drawer, so click through the DOM.
    const btn = page.locator('button.admin-nav-item').nth(screen.tabIndex);
    await btn.evaluate(el => el.click(), null, { timeout: 8000 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForLoadState('networkidle').catch(() => {});
    await sleep(900);
  }
  if (screen.click) { await page.getByRole('button', { name: screen.click, exact: false }).first().click().catch(() => {}); await sleep(900); }
  if (screen.locate) {
    const el = page.getByText(screen.locate, { exact: false }).first();
    if (await el.count()) {
      if (screen.ring) await el.evaluate(e => { const c = e.parentElement; c.style.boxShadow = '0 0 0 3px #1D9E75, 0 12px 34px rgba(15,110,86,.28)'; c.style.background = '#fff'; });
      await el.evaluate((e, off) => window.scrollTo({ top: e.getBoundingClientRect().top + window.scrollY - off, behavior: 'instant' }), screen.ring ? 250 : 200);
    }
  }
  if (screen.scroll) await page.evaluate(y => window.scrollBy({ top: y, behavior: 'instant' }), screen.scroll);
  await sleep(600);
  await page.evaluate(scrub, names);
  await page.evaluate(([css, text]) => {
    document.getElementById('__aq_cap')?.remove();
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    const cap = document.createElement('div'); cap.id = '__aq_cap'; cap.textContent = text;
    document.documentElement.appendChild(cap);
  }, [CAPTION_CSS, caption]);
  await page.screenshot({ path: png });
  await page.evaluate(() => document.getElementById('__aq_cap')?.remove());
}

function strings(lang) {
  const file = path.join(HERE, 'i18n', `${lang}.json`);
  return lang === 'en' || !fs.existsSync(file) ? {} : JSON.parse(fs.readFileSync(file));
}

function metadata(flow, lang, [hook, c1, c2, title]) {
  const utm = `utm_source=shorts&utm_medium=social&utm_campaign=aviqr-shorts&utm_content=${flow.id}-${lang}`;
  const tags = [...new Set([...flow.tags, 'AviQR', 'restaurant software', 'hotel software', 'India'])];
  const description = [`${hook}`, `${c1}. ${c2}.`, '',
    'AviQR — one platform for restaurants, hotels and food courts: QR menu, orders, KOT, billing, PMS, booking engine and reports.',
    `Start free: https://aviqr.com/?${utm}`, '', tags.map(t => '#' + t.replace(/[^\p{L}\p{N}]/gu, '')).join(' ')].join('\n');
  return { title: `${title} | AviQR`, description, tags, made_for_kids: false, lang };
}

async function main() {
  const args = process.argv.slice(2);
  const list = flag => { const i = args.indexOf(flag); return i < 0 ? [] : args.slice(i + 1).filter((a, j, all) => !all.slice(0, j + 1).some(x => x.startsWith('--')) && !a.startsWith('--')); };
  const only = list('--only'), langs = list('--lang').length ? list('--lang') : LANGS;
  const skip = args.includes('--skip-existing');
  fs.mkdirSync(SHOTS, { recursive: true }); fs.mkdirSync(VIDEOS, { recursive: true });
  const names = maskNames();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failed = [];
  for (const lang of langs) {
    const tr = strings(lang);
    const end = tr._end ? { title: tr._end[0], sub: tr._end[1], tag: tr._end[2] } : {};
    for (const flow of FLOWS) {
      if (only.length && !only.some(o => flow.id.startsWith(o))) continue;
      if (flow.noEn && lang === 'en') continue;
      const id = `${flow.id}-${lang}`, mp4 = path.join(VIDEOS, `${id}.mp4`);
      if (skip && fs.existsSync(mp4)) continue;
      const text = tr[flow.id] || flow.en;
      if (lang !== 'en' && !tr[flow.id]) { console.log('no translation, skip', id); continue; }
      try {
        const hook = path.join(SHOTS, `${id}-0.png`), endPng = path.join(SHOTS, `end-${lang}.png`);
        await card(browser, 'hook', text[0], hook);
        if (!fs.existsSync(endPng)) await card(browser, 'end', '', endPng, end);
        const shots = [];
        for (const [i, screen] of flow.screens.entries()) {
          const png = path.join(SHOTS, `${id}-${i + 1}.png`);
          await capture(browser, screen, lang, text[i + 1], png, names);
          shots.push({ png, seconds: SHOT_S });
        }
        encode([{ png: hook, seconds: HOOK_S }, ...shots, { png: endPng, seconds: END_S }], mp4);
        fs.copyFileSync(shots[0].png, path.join(VIDEOS, `${id}.png`));
        fs.writeFileSync(path.join(VIDEOS, `${id}.json`), JSON.stringify(metadata(flow, lang, text), null, 1));
        console.log('rendered', id);
      } catch (e) { failed.push(id); console.log('FAILED', id, e.message.split('\n')[0]); }
    }
  }
  await browser.close();
  console.log(failed.length ? `failed (${failed.length}): ${failed.join(' ')}` : 'all rendered');
}

await main();
